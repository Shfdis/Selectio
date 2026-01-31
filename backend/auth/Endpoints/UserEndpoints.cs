using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using auth.Data;
using auth.Models;
using auth.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
    
namespace auth.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        app.MapPost(
                "/user",
                async (User user, UserDbContext dbContext, IEmailService emailService, CancellationToken cancellationToken) =>
                {
                    var emailExists = await dbContext.Users.AnyAsync(u => u.Email == user.email, cancellationToken)
                        || await dbContext.PendingEmails.AnyAsync(p => p.Email == user.email, cancellationToken);
                    if (emailExists)
                    {
                        return Results.Conflict(
                            new { message = "A user with this email already exists or is pending verification." }
                        );
                    }

                    var uuid = Guid.NewGuid();
                    var timestamp = DateTime.UtcNow;
                    var passwordHash = BCrypt.Net.BCrypt.HashPassword(user.password);

                    var pendingEmail = new PendingEmail
                    {
                        Uuid = uuid,
                        Email = user.email,
                        Username = user.username,
                        Description = user.description,
                        PasswordHash = passwordHash,
                        Timestamp = timestamp,
                    };

                    dbContext.PendingEmails.Add(pendingEmail);
                    await dbContext.SaveChangesAsync(cancellationToken);

                    try
                    {
                        await emailService.SendVerificationEmailAsync(
                            user.email,
                            user.username,
                            uuid,
                            cancellationToken
                        );
                    }
                    catch (Exception)
                    {
                        dbContext.PendingEmails.Remove(pendingEmail);
                        await dbContext.SaveChangesAsync(cancellationToken);
                        return Results.Problem(
                            statusCode: 503,
                            title: "Service Unavailable",
                            detail: "Unable to send verification email. Please try again later."
                        );
                    }

                    return Results.Ok(
                        new { message = "User registration pending email verification. Please check your email for the verification link." }
                    );
                }
            )
            .WithName("RegisterUser")
            .WithOpenApi();

        app.MapPost(
                "/user/verify/{uuid}",
                async (Guid uuid, UserDbContext userDb) => await ExecuteVerifyByUuidAsync(uuid, userDb)
            )
            .WithName("VerifyUser")
            .WithOpenApi();

        // GET /user/verify/{uuid} - Browser-friendly; verification links use GET
        app.MapGet(
                "/user/verify/{uuid}",
                async (Guid uuid, UserDbContext userDb) => await ExecuteVerifyByUuidAsync(uuid, userDb)
            )
            .WithName("VerifyUserGet")
            .WithOpenApi();

        // POST /user/verify - Authenticate user with email and password, return JWT token
        app.MapPost(
                "/user/verify",
                async (
                    LoginRequest loginRequest,
                    UserDbContext userDb,
                    IConfiguration configuration
                ) =>
                {
                    // Find user by email
                    var user = await userDb.Users.FirstOrDefaultAsync(u =>
                        u.Email == loginRequest.email
                    );

                    if (user == null)
                    {
                        return Results.Unauthorized();
                    }

                    // Verify password
                    if (!BCrypt.Net.BCrypt.Verify(loginRequest.password, user.PasswordHash))
                    {
                        return Results.Unauthorized();
                    }

                    // Generate JWT token
                    var jwtSecret = configuration["Jwt:SecretKey"]
                        ?? "your-super-secret-key-change-this-in-production-minimum-32-characters";
                    var jwtIssuer = configuration["Jwt:Issuer"] ?? "SelectioAuth";
                    var jwtAudience = configuration["Jwt:Audience"] ?? "SelectioUsers";
                    var jwtExpiryMinutes = int.Parse(
                        configuration["Jwt:ExpiryMinutes"] ?? "1440"
                    ); // Default 24 hours

                    var tokenHandler = new JwtSecurityTokenHandler();
                    var key = Encoding.UTF8.GetBytes(jwtSecret);
                    var expiresAt = DateTime.UtcNow.AddMinutes(jwtExpiryMinutes);

                    var tokenDescriptor = new SecurityTokenDescriptor
                    {
                        Subject = new ClaimsIdentity(
                            new[]
                            {
                                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                                new Claim(ClaimTypes.Email, user.Email),
                                new Claim(ClaimTypes.Name, user.Username)
                            }
                        ),
                        Expires = expiresAt,
                        Issuer = jwtIssuer,
                        Audience = jwtAudience,
                        SigningCredentials = new SigningCredentials(
                            new SymmetricSecurityKey(key),
                            SecurityAlgorithms.HmacSha256Signature
                        )
                    };

                    var token = tokenHandler.CreateToken(tokenDescriptor);
                    var tokenString = tokenHandler.WriteToken(token);

                    // Store token in database
                    var dbToken = new Token
                    {
                        UserId = user.Id,
                        JwtToken = tokenString,
                        CreatedAt = DateTime.UtcNow,
                        ExpiresAt = expiresAt,
                        IsRevoked = false
                    };

                    userDb.Tokens.Add(dbToken);
                    await userDb.SaveChangesAsync();

                    return Results.Ok(
                        new
                        {
                            token = tokenString,
                            expiresAt = expiresAt,
                            user = new
                            {
                                id = user.Id,
                                email = user.Email,
                                username = user.Username
                            }
                        }
                    );
                }
            )
            .WithName("LoginUser")
            .WithOpenApi();

        // GET /user/identify - Get user data from JWT token
        app.MapGet(
                "/user/identify",
                async (HttpContext httpContext, UserDbContext userDb, IConfiguration configuration) =>
                {
                    // Prefer gateway-provided identity when accompanied by the shared internal token.
                    // This allows the gateway to be the single enforcement point without forwarding client JWT.
                    var userId = TryGetGatewayUserId(httpContext, configuration) ?? TryGetJwtUserId(httpContext);
                    if (userId is null)
                    {
                        return Results.Unauthorized();
                    }

                    // Fetch user from database
                    var user = await userDb.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
                    if (user == null)
                    {
                        return Results.NotFound(new { message = "User not found" });
                    }

                    return Results.Ok(
                        new
                        {
                            id = user.Id,
                            email = user.Email,
                            username = user.Username,
                            description = user.Description
                        }
                    );
                }
            )
            .WithName("IdentifyUser")
            .WithOpenApi();

        // DELETE /user/delete - Delete user account and all associated tokens (cascade delete)
        app.MapDelete(
                "/user/delete",
                async (HttpContext httpContext, UserDbContext userDb, IConfiguration configuration) =>
                {
                    var userId = TryGetGatewayUserId(httpContext, configuration) ?? TryGetJwtUserId(httpContext);
                    if (userId is null)
                    {
                        return Results.Unauthorized();
                    }

                    // Fetch user from database
                    var user = await userDb.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
                    if (user == null)
                    {
                        return Results.NotFound(new { message = "User not found" });
                    }

                    // Delete user - tokens will be cascade deleted automatically
                    userDb.Users.Remove(user);
                    await userDb.SaveChangesAsync();

                    return Results.Ok(new { message = "User account deleted successfully" });
                }
            )
            .WithName("DeleteUser")
            .WithOpenApi();
    }

    private const string GatewayUserIdHeader = "X-User-Id";
    private const string GatewayInternalTokenHeader = "X-Gateway-Internal-Token";

    private static async Task<IResult> ExecuteVerifyByUuidAsync(Guid uuid, UserDbContext userDb)
    {
        var pendingEmail = await userDb.PendingEmails.FirstOrDefaultAsync(p =>
            p.Uuid == uuid
        );

        if (pendingEmail == null)
        {
            return Results.NotFound(new { message = "Invalid verification UUID" });
        }

        // Create verified user (password is already hashed)
        var verifiedUser = new VerifiedUser
        {
            Email = pendingEmail.Email,
            Username = pendingEmail.Username,
            Description = pendingEmail.Description,
            PasswordHash = pendingEmail.PasswordHash,
            CreatedAt = DateTime.UtcNow,
        };

        try
        {
            userDb.Users.Add(verifiedUser);
            await userDb.SaveChangesAsync();

            // Remove from pending emails
            userDb.PendingEmails.Remove(pendingEmail);
            await userDb.SaveChangesAsync();

            return Results.Ok(new { message = "User verified and created successfully" });
        }
        catch (DbUpdateException)
        {
            // Handle duplicate email
            return Results.BadRequest(
                new { message = "User with this email already exists" }
            );
        }
    }

    private static int? TryGetGatewayUserId(HttpContext httpContext, IConfiguration configuration)
    {
        var expected = configuration["Gateway:InternalToken"] ?? string.Empty;
        if (string.IsNullOrWhiteSpace(expected))
        {
            return null;
        }

        if (!httpContext.Request.Headers.TryGetValue(GatewayInternalTokenHeader, out var provided) ||
            !string.Equals(provided.ToString(), expected, StringComparison.Ordinal))
        {
            return null;
        }

        if (!httpContext.Request.Headers.TryGetValue(GatewayUserIdHeader, out var userIdHeader))
        {
            return null;
        }

        return int.TryParse(userIdHeader.ToString(), out var userId) ? userId : null;
    }

    private static int? TryGetJwtUserId(HttpContext httpContext)
    {
        var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return null;
        }

        return userId;
    }
}
