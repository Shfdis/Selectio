using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace auth.Services;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string email, string username, Guid verificationUuid, CancellationToken cancellationToken = default);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(string email, string username, Guid verificationUuid, CancellationToken cancellationToken = default)
    {
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"];
            if (string.IsNullOrEmpty(smtpHost))
            {
                _logger.LogWarning("Email:SmtpHost not configured. Skipping email send.");
                return;
            }

            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUsername = _configuration["Email:SmtpUsername"];
            var smtpPassword = _configuration["Email:SmtpPassword"];
            var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@selectio.com";
            var fromName = _configuration["Email:FromName"] ?? "Selectio";
            var baseUrl = _configuration["Email:BaseUrl"] ?? "http://localhost:8080";

            var verificationLink = $"{baseUrl}/user/verify/{verificationUuid}";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress(username, email));
            message.Subject = "Verify your Selectio account";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1>Welcome to Selectio!</h1>
        </div>
        <div class=""content"">
            <p>Hi {username},</p>
            <p>Thank you for registering with Selectio. Please verify your email address by clicking the button below:</p>
            <p style=""text-align: center;"">
                <a href=""{verificationLink}"" class=""button"">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style=""word-break: break-all; color: #666;"">{verificationLink}</p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with Selectio, please ignore this email.</p>
        </div>
        <div class=""footer"">
            <p>© {DateTime.UtcNow.Year} Selectio. All rights reserved.</p>
        </div>
    </div>
</body>
</html>",
                TextBody = $@"
Welcome to Selectio!

Hi {username},

Thank you for registering with Selectio. Please verify your email address by visiting the following link:

{verificationLink}

This verification link will expire in 24 hours.

If you didn't create an account with Selectio, please ignore this email.

© {DateTime.UtcNow.Year} Selectio. All rights reserved.
"
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            
            // For development/testing, allow self-signed certificates
            if (_configuration.GetValue<bool>("Email:AllowInsecureSsl", false))
            {
                client.ServerCertificateValidationCallback = (s, c, h, e) => true;
            }

            // Mail.ru requires STARTTLS on port 587 (or SSL on port 465)
            _logger.LogInformation("Connecting to SMTP server {Host}:{Port}", smtpHost, smtpPort);
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls, cancellationToken);

            // Mail.ru requires authentication
            if (string.IsNullOrEmpty(smtpUsername) || string.IsNullOrEmpty(smtpPassword))
            {
                throw new InvalidOperationException("SMTP username and password are required");
            }

            _logger.LogInformation("Authenticating with SMTP server");
            await client.AuthenticateAsync(smtpUsername, smtpPassword, cancellationToken);

            _logger.LogInformation("Sending email to {Email}", email);
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation("Verification email sent successfully to {Email}", email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", email);
            throw;
        }
    }
}
