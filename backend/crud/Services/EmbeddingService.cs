using crud.Data;
using crud.Entities;
using Microsoft.EntityFrameworkCore;
using Pgvector;

namespace crud.Services;

public static class EmbeddingService
{
    public const int Dimensions = 72;

    public static bool IsFullEmbedding(Vector? v) => v is not null && v.ToArray().Length == Dimensions;

    public static Vector? ToVector(float[]? a) =>
        a is null || a.Length != Dimensions ? null : new Vector((float[])a.Clone());

    /// <summary>
    /// Average of multiple embedding vectors. Returns null if no non-null vectors or dimensions mismatch.
    /// </summary>
    public static float[]? AverageVectors(IReadOnlyList<float[]?> vectors)
    {
        var valid = vectors.Where(v => v != null && v.Length == Dimensions).ToList();
        if (valid.Count == 0) return null;
        if (valid.Count == 1) return (float[])valid[0]!.Clone();

        var result = new float[Dimensions];
        for (int i = 0; i < Dimensions; i++)
        {
            float sum = 0;
            foreach (var v in valid)
                sum += v![i];
            result[i] = sum / valid.Count;
        }
        return result;
    }

    /// <summary>
    /// Average of pgvector embeddings as a new <see cref="Vector"/> (or null).
    /// </summary>
    public static Vector? AverageVectors(IReadOnlyList<Vector?> vectors)
    {
        var arrays = vectors.Select(v => v?.ToArray()).ToList();
        var avg = AverageVectors(arrays);
        return ToVector(avg);
    }

    /// <summary>
    /// Compute post embedding: avg(community, book) if community has other published posts; else book only.
    /// </summary>
    public static async Task<Vector?> ComputePostEmbeddingAsync(
        CrudDbContext db,
        int communityId,
        int bookId,
        int? excludePostId,
        CancellationToken ct = default)
    {
        var bookVec = await db.Books
            .Where(b => b.Id == bookId)
            .Select(b => b.Embedding)
            .FirstOrDefaultAsync(ct);
        if (!IsFullEmbedding(bookVec)) return null;

        var otherPublishedQuery = db.Posts
            .Where(p => p.CommunityId == communityId && p.Status == PostStatus.Published);
        if (excludePostId.HasValue)
            otherPublishedQuery = otherPublishedQuery.Where(p => p.Id != excludePostId.Value);
        var otherPublishedCount = await otherPublishedQuery.CountAsync(ct);
        if (otherPublishedCount == 0) return new Vector(bookVec!.ToArray());

        var communityVec = await db.Communities
            .Where(c => c.Id == communityId)
            .Select(c => c.Embedding)
            .FirstOrDefaultAsync(ct);
        if (!IsFullEmbedding(communityVec)) return new Vector(bookVec!.ToArray());

        return AverageVectors(new List<Vector?> { communityVec, bookVec });
    }

    /// <summary>
    /// Recompute community embedding as average of all published posts' embeddings.
    /// </summary>
    public static async Task RecomputeCommunityEmbeddingAsync(
        CrudDbContext db,
        int communityId,
        CancellationToken ct = default)
    {
        var postEmbeddings = await db.Posts
            .Where(p => p.CommunityId == communityId && p.Status == PostStatus.Published && p.Embedding != null)
            .Select(p => p.Embedding)
            .ToListAsync(ct);
        var avg = AverageVectors(postEmbeddings!);
        var community = await db.Communities.FirstOrDefaultAsync(c => c.Id == communityId, ct);
        if (community is not null)
        {
            community.Embedding = avg;
            await db.SaveChangesAsync(ct);
        }
    }

    /// <summary>
    /// Set post embedding and recompute community embedding. Call after adding/updating a published post.
    /// </summary>
    public static async Task UpdatePostAndCommunityEmbeddingsAsync(
        CrudDbContext db,
        int postId,
        int communityId,
        int bookId,
        PostStatus status,
        CancellationToken ct = default)
    {
        var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == postId, ct);
        if (post is null) return;

        if (status == PostStatus.Published)
        {
            post.Embedding = await ComputePostEmbeddingAsync(db, communityId, bookId, postId, ct);
            await db.SaveChangesAsync(ct);
        }

        await RecomputeCommunityEmbeddingAsync(db, communityId, ct);
    }

    /// <summary>
    /// Recompute community embedding after a post was removed. Call after deleting a post.
    /// </summary>
    public static async Task OnPostDeletedAsync(
        CrudDbContext db,
        int communityId,
        CancellationToken ct = default)
    {
        await RecomputeCommunityEmbeddingAsync(db, communityId, ct);
    }

    /// <summary>
    /// User embedding = average of embeddings of books in user's library.
    /// </summary>
    public static async Task<float[]?> GetUserEmbeddingAsync(
        CrudDbContext db,
        int userId,
        CancellationToken ct = default)
    {
        var embeddings = await db.UserBooks
            .Where(ub => ub.UserId == userId)
            .Join(db.Books, ub => ub.BookId, b => b.Id, (ub, b) => b.Embedding)
            .Where(emb => emb != null)
            .ToListAsync(ct);
        var arrays = embeddings.Where(IsFullEmbedding).Select(v => v!.ToArray()).ToList();
        return AverageVectors(arrays);
    }

    /// <summary>
    /// Cosine similarity between two non-null vectors of same length. Returns value in [-1, 1].
    /// </summary>
    public static float CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) throw new ArgumentException("Vectors must have same length.");
        float dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) return 0;
        return dot / (MathF.Sqrt(normA) * MathF.Sqrt(normB));
    }

    public static float CosineSimilarity(float[] user, Vector post) =>
        CosineSimilarity(user, post.ToArray());
}
