using crud.Contracts;
using crud.Data;
using crud.Entities;
using crud.Infrastructure;
using crud.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace crud.Endpoints;

public static class CommentEndpoints
{
    public static IEndpointRouteBuilder MapCommentEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/posts/{id:int}/comments", async (HttpContext http, CrudDbContext db, int id, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, defaultPageSize: 50, maxPageSize: 200);
            var userId = GatewayIdentity.GetUserId(http);

            var exists = await db.Posts.AnyAsync(x => x.Id == id, cancellationToken);
            if (!exists) return Results.NotFound();

            var rows = await db.PostComments
                .AsNoTracking()
                .Where(c => c.PostId == id)
                .OrderBy(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync(cancellationToken);

            var items = await MapPostCommentsAsync(db, rows, userId, cancellationToken);
            return Results.Ok(items);
        })
        .WithTags("Comments")
        .WithSummary("List comments on a post")
        .WithDescription("Returns post comments oldest-first with authorUsername resolved from user profiles (fallback user{id}).")
        .Produces<List<PostCommentDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        app.MapPost("/api/posts/{id:int}/comments", async (HttpContext http, CrudDbContext db, int id, CreateCommentRequest body, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var contentError = EndpointHelpers.RequireContent(body.Content);
            if (contentError is not null) return contentError;

            var exists = await db.Posts.AnyAsync(x => x.Id == id, cancellationToken);
            if (!exists) return Results.NotFound();

            var comment = new PostComment
            {
                PostId = id,
                AuthorUserId = userId,
                Content = body.Content!.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            db.PostComments.Add(comment);
            await db.SaveChangesAsync(cancellationToken);

            await SeenTracking.UpsertSeenPostAsync(db, userId, id, DateTime.UtcNow, cancellationToken);

            var names = await CommentAuthorNames.ResolveAsync(db, new[] { userId }, cancellationToken);
            var dto = new PostCommentDto(comment.Id, comment.PostId, comment.AuthorUserId, names[userId], comment.Content, comment.CreatedAt, 0, false);
            return Results.Ok(dto);
        })
        .WithTags("Comments")
        .WithSummary("Add a comment to a post")
        .WithDescription("Creates a comment as the authenticated user; response includes authorUsername.")
        .Produces<PostCommentDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapPut("/api/comments/{id:int}", async (HttpContext http, CrudDbContext db, int id, UpdateCommentRequest body, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var contentError = EndpointHelpers.RequireContent(body.Content);
            if (contentError is not null) return contentError;

            var comment = await db.PostComments.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (comment is null) return Results.NotFound();

            comment.Content = body.Content!.Trim();
            await db.SaveChangesAsync(cancellationToken);

            await SeenTracking.UpsertSeenPostAsync(db, userId, comment.PostId, DateTime.UtcNow, cancellationToken);

            var names = await CommentAuthorNames.ResolveAsync(db, new[] { comment.AuthorUserId }, cancellationToken);
            var likeCount = await db.PostCommentLikes.CountAsync(x => x.CommentId == comment.Id, cancellationToken);
            var likedByCurrentUser = await db.PostCommentLikes.AnyAsync(x => x.CommentId == comment.Id && x.UserId == userId, cancellationToken);
            var dto = new PostCommentDto(
                comment.Id,
                comment.PostId,
                comment.AuthorUserId,
                names[comment.AuthorUserId],
                comment.Content,
                comment.CreatedAt,
                likeCount,
                likedByCurrentUser);
            return Results.Ok(dto);
        })
        .WithTags("Comments")
        .WithSummary("Update a post comment")
        .WithDescription("Updates comment text for a comment owned by the authenticated user (enforced at gateway).")
        .Produces<PostCommentDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapPost("/api/comments/{id:int}/like", async (HttpContext http, CrudDbContext db, int id, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var commentRow = await db.PostComments.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (commentRow is null) return Results.NotFound();

            var like = await db.PostCommentLikes.FirstOrDefaultAsync(x => x.CommentId == id && x.UserId == userId, cancellationToken);
            if (like is null)
            {
                db.PostCommentLikes.Add(new PostCommentLike
                {
                    CommentId = id,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync(cancellationToken);
            }

            await SeenTracking.UpsertSeenPostAsync(db, userId, commentRow.PostId, DateTime.UtcNow, cancellationToken);

            return Results.Ok(new { commentId = id, userId, liked = true });
        })
        .WithTags("Comments")
        .WithSummary("Like a post comment")
        .WithDescription("Idempotent: adds like for (comment, current user) if missing.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapDelete("/api/comments/{id:int}/like", async (HttpContext http, CrudDbContext db, int id, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var commentRow = await db.PostComments.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (commentRow is null) return Results.NotFound();

            var like = await db.PostCommentLikes.FirstOrDefaultAsync(x => x.CommentId == id && x.UserId == userId, cancellationToken);
            if (like is not null)
            {
                db.PostCommentLikes.Remove(like);
                await db.SaveChangesAsync(cancellationToken);
            }

            await SeenTracking.UpsertSeenPostAsync(db, userId, commentRow.PostId, DateTime.UtcNow, cancellationToken);

            return Results.Ok(new { commentId = id, userId, liked = false });
        })
        .WithTags("Comments")
        .WithSummary("Unlike a post comment")
        .WithDescription("Idempotent: removes like for (comment, current user) if present.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapDelete("/api/comments/{id:int}", async (HttpContext http, CrudDbContext db, int id, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var comment = await db.PostComments.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (comment is null) return Results.NotFound();

            var postId = comment.PostId;
            db.PostComments.Remove(comment);
            await db.SaveChangesAsync(cancellationToken);
            await SeenTracking.UpsertSeenPostAsync(db, userId, postId, DateTime.UtcNow, cancellationToken);
            return Results.Ok(new { message = "deleted" });
        })
        .WithTags("Comments")
        .WithSummary("Delete a post comment")
        .WithDescription("Deletes a comment row (owner enforced at gateway).")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapGet("/api/books/{id:int}/comments", async (CrudDbContext db, int id, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, defaultPageSize: 50, maxPageSize: 200);

            var exists = await db.Books.AnyAsync(x => x.Id == id, cancellationToken);
            if (!exists) return Results.NotFound();

            var rows = await db.BookComments
                .AsNoTracking()
                .Where(c => c.BookId == id)
                .OrderBy(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync(cancellationToken);

            var items = await MapBookCommentsAsync(db, rows, cancellationToken);
            return Results.Ok(items);
        })
        .WithTags("Comments")
        .WithSummary("List book comments (reviews)")
        .WithDescription("Returns book reviews oldest-first with authorUsername from profiles.")
        .Produces<List<BookCommentDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        app.MapPost("/api/books/{id:int}/comments", async (HttpContext http, CrudDbContext db, int id, CreateBookCommentRequest body, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var contentError = EndpointHelpers.RequireContent(body.Content);
            if (contentError is not null) return contentError;

            if (body.Rating is < 1 or > 5)
            {
                return Results.BadRequest(new { message = "rating must be between 1 and 5" });
            }

            var exists = await db.Books.AnyAsync(x => x.Id == id, cancellationToken);
            if (!exists) return Results.NotFound();

            var comment = new BookComment
            {
                BookId = id,
                AuthorUserId = userId,
                Content = body.Content!.Trim(),
                Rating = body.Rating,
                CreatedAt = DateTime.UtcNow
            };

            db.BookComments.Add(comment);
            await db.SaveChangesAsync(cancellationToken);

            await SeenTracking.UpsertSeenBookAsync(db, userId, id, DateTime.UtcNow, cancellationToken);

            var names = await CommentAuthorNames.ResolveAsync(db, new[] { userId }, cancellationToken);
            var dto = new BookCommentDto(comment.Id, comment.BookId, comment.AuthorUserId, names[userId], comment.Content, comment.Rating, comment.CreatedAt);
            return Results.Ok(dto);
        })
        .WithTags("Comments")
        .WithSummary("Add a book review")
        .WithDescription("Creates a rating+text review; response includes authorUsername.")
        .Produces<BookCommentDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapPut("/api/book-comments/{id:int}", async (HttpContext http, CrudDbContext db, int id, CreateBookCommentRequest body, CancellationToken cancellationToken) =>
        {
            var (_, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var contentError = EndpointHelpers.RequireContent(body.Content);
            if (contentError is not null) return contentError;

            if (body.Rating is < 1 or > 5)
            {
                return Results.BadRequest(new { message = "rating must be between 1 and 5" });
            }

            var comment = await db.BookComments.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (comment is null) return Results.NotFound();

            comment.Content = body.Content!.Trim();
            comment.Rating = body.Rating;
            await db.SaveChangesAsync(cancellationToken);

            await SeenTracking.UpsertSeenBookAsync(db, comment.AuthorUserId, comment.BookId, DateTime.UtcNow, cancellationToken);

            var names = await CommentAuthorNames.ResolveAsync(db, new[] { comment.AuthorUserId }, cancellationToken);
            var dto = new BookCommentDto(comment.Id, comment.BookId, comment.AuthorUserId, names[comment.AuthorUserId], comment.Content, comment.Rating, comment.CreatedAt);
            return Results.Ok(dto);
        })
        .WithTags("Comments")
        .WithSummary("Update a book review")
        .WithDescription("Updates review text and rating for a review owned by the authenticated user (enforced at gateway).")
        .Produces<BookCommentDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapDelete("/api/book-comments/{id:int}", async (HttpContext http, CrudDbContext db, int id, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var comment = await db.BookComments.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (comment is null) return Results.NotFound();

            var bookId = comment.BookId;
            db.BookComments.Remove(comment);
            await db.SaveChangesAsync(cancellationToken);
            await SeenTracking.UpsertSeenBookAsync(db, userId, bookId, DateTime.UtcNow, cancellationToken);
            return Results.Ok(new { message = "deleted" });
        })
        .WithTags("Comments")
        .WithSummary("Delete a book review")
        .WithDescription("Deletes a book review row (owner enforced at gateway).")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        app.MapGet("/api/users/me/book-comments", async (HttpContext http, CrudDbContext db, int? page, int? pageSize, CancellationToken cancellationToken) =>
        {
            var (userId, error) = EndpointHelpers.RequireUserId(http);
            if (error is not null) return error;

            var (p, ps) = EndpointHelpers.NormalizePagination(page, pageSize, defaultPageSize: 50, maxPageSize: 200);

            var rows = await db.BookComments
                .AsNoTracking()
                .Include(c => c.Book)
                .Where(c => c.AuthorUserId == userId)
                .OrderBy(c => c.CreatedAt)
                .ThenBy(c => c.Id)
                .Skip((p - 1) * ps)
                .Take(ps)
                .ToListAsync(cancellationToken);

            var names = await CommentAuthorNames.ResolveAsync(db, rows.Select(c => c.AuthorUserId), cancellationToken);
            var items = new List<MyBookCommentItemDto>(rows.Count);
            foreach (var c in rows)
            {
                var book = c.Book;
                var bookDto = book is null
                    ? new BookCommentBookSummaryDto(c.BookId, string.Empty, string.Empty, string.Empty, string.Empty)
                    : new BookCommentBookSummaryDto(book.Id, book.Title, book.Author, book.Genre, book.CoverUrl);
                items.Add(new MyBookCommentItemDto(
                    c.Id,
                    c.BookId,
                    c.AuthorUserId,
                    names[c.AuthorUserId],
                    c.Content,
                    c.Rating,
                    c.CreatedAt,
                    bookDto));
            }

            return Results.Ok(items);
        })
        .WithTags("Comments")
        .WithSummary("List my book reviews with book summary")
        .WithDescription("Returns the authenticated user's book comments with a nested book summary for profile/reviews UIs.")
        .Produces<List<MyBookCommentItemDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        return app;
    }

    private static async Task<List<PostCommentDto>> MapPostCommentsAsync(
        CrudDbContext db,
        List<PostComment> rows,
        int? currentUserId,
        CancellationToken cancellationToken)
    {
        var commentIds = rows.Select(c => c.Id).ToList();
        var names = await CommentAuthorNames.ResolveAsync(db, rows.Select(c => c.AuthorUserId), cancellationToken);
        var likeCounts = await db.PostCommentLikes
            .AsNoTracking()
            .Where(l => commentIds.Contains(l.CommentId))
            .GroupBy(l => l.CommentId)
            .Select(g => new { CommentId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CommentId, x => x.Count, cancellationToken);

        HashSet<int> likedByCurrent = new();
        if (currentUserId is not null)
        {
            likedByCurrent = await db.PostCommentLikes
                .AsNoTracking()
                .Where(l => l.UserId == currentUserId.Value && commentIds.Contains(l.CommentId))
                .Select(l => l.CommentId)
                .ToHashSetAsync(cancellationToken);
        }

        return rows
            .Select(c => new PostCommentDto(
                c.Id,
                c.PostId,
                c.AuthorUserId,
                names[c.AuthorUserId],
                c.Content,
                c.CreatedAt,
                likeCounts.GetValueOrDefault(c.Id, 0),
                likedByCurrent.Contains(c.Id)))
            .ToList();
    }

    private static async Task<List<BookCommentDto>> MapBookCommentsAsync(
        CrudDbContext db,
        List<BookComment> rows,
        CancellationToken cancellationToken)
    {
        var names = await CommentAuthorNames.ResolveAsync(db, rows.Select(c => c.AuthorUserId), cancellationToken);
        return rows
            .Select(c => new BookCommentDto(c.Id, c.BookId, c.AuthorUserId, names[c.AuthorUserId], c.Content, c.Rating, c.CreatedAt))
            .ToList();
    }
}
