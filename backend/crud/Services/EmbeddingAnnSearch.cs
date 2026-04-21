using crud.Entities;
using Npgsql;
using NpgsqlTypes;
using Pgvector;

namespace crud.Services;

/// <summary>Approximate nearest-neighbour using pgvector cosine distance (&lt;=&gt;).</summary>
public static class EmbeddingAnnSearch
{
    /// <summary>
    /// Uses a dedicated connection from <paramref name="dataSource"/> so we never open/close
    /// <see cref="Microsoft.EntityFrameworkCore.DbContext"/>'s shared connection, which can corrupt the pool.
    /// </summary>
    public static async Task<List<int>> GetRecommendedBookIdsAsync(
        NpgsqlDataSource dataSource,
        float[] userEmbedding,
        IReadOnlyList<int> excludeBookIds,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT b."Id"
            FROM crud."Books" b
            WHERE b."Embedding" IS NOT NULL
              AND (@ex_len = 0 OR NOT (b."Id" = ANY (@ex)))
            ORDER BY b."Embedding" <=> @query
            LIMIT @lim OFFSET @off
            """,
            conn);

        var ex = excludeBookIds.Count == 0 ? Array.Empty<int>() : excludeBookIds.ToArray();
        cmd.Parameters.Add(new NpgsqlParameter("query", new Vector(userEmbedding)) { DataTypeName = "vector" });
        cmd.Parameters.Add(new NpgsqlParameter("ex", ex) { DataTypeName = "integer[]" });
        cmd.Parameters.Add(new NpgsqlParameter("ex_len", NpgsqlDbType.Integer) { Value = ex.Length });
        cmd.Parameters.Add(new NpgsqlParameter("lim", NpgsqlDbType.Integer) { Value = take });
        cmd.Parameters.Add(new NpgsqlParameter("off", NpgsqlDbType.Integer) { Value = skip });

        var ids = new List<int>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            ids.Add(reader.GetInt32(0));
        }

        return ids;
    }

    public static async Task<List<int>> GetRecommendedPostIdsAsync(
        NpgsqlDataSource dataSource,
        float[] userEmbedding,
        IReadOnlyList<int> excludePostIds,
        int skip,
        int take,
        CancellationToken cancellationToken = default)
    {
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT p."Id"
            FROM crud."Posts" p
            WHERE p."Status" = @published
              AND p."Embedding" IS NOT NULL
              AND (@ex_len = 0 OR NOT (p."Id" = ANY (@ex)))
            ORDER BY p."Embedding" <=> @query
            LIMIT @lim OFFSET @off
            """,
            conn);

        var ex = excludePostIds.Count == 0 ? Array.Empty<int>() : excludePostIds.ToArray();
        cmd.Parameters.Add(new NpgsqlParameter("query", new Vector(userEmbedding)) { DataTypeName = "vector" });
        cmd.Parameters.Add(new NpgsqlParameter("published", NpgsqlDbType.Integer) { Value = (int)PostStatus.Published });
        cmd.Parameters.Add(new NpgsqlParameter("ex", ex) { DataTypeName = "integer[]" });
        cmd.Parameters.Add(new NpgsqlParameter("ex_len", NpgsqlDbType.Integer) { Value = ex.Length });
        cmd.Parameters.Add(new NpgsqlParameter("lim", NpgsqlDbType.Integer) { Value = take });
        cmd.Parameters.Add(new NpgsqlParameter("off", NpgsqlDbType.Integer) { Value = skip });

        var ids = new List<int>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            ids.Add(reader.GetInt32(0));
        }

        return ids;
    }
}
