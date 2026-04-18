using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace crud.Migrations;

/// <summary>
/// Enables pgvector, converts embedding columns from real[] to vector(72), and adds HNSW cosine indexes.
/// </summary>
public partial class PgvectorEmbeddings : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Install in public so the pgvector type OID is "vector", which Npgsql + UseVector() map correctly.
        migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;");

        migrationBuilder.Sql(
            """
            ALTER TABLE crud."Books"
            ALTER COLUMN "Embedding" TYPE public.vector(72)
            USING (CASE WHEN "Embedding" IS NULL THEN NULL ELSE "Embedding"::public.vector(72) END);
            """);

        migrationBuilder.Sql(
            """
            ALTER TABLE crud."Posts"
            ALTER COLUMN "Embedding" TYPE public.vector(72)
            USING (CASE WHEN "Embedding" IS NULL THEN NULL ELSE "Embedding"::public.vector(72) END);
            """);

        migrationBuilder.Sql(
            """
            ALTER TABLE crud."Communities"
            ALTER COLUMN "Embedding" TYPE public.vector(72)
            USING (CASE WHEN "Embedding" IS NULL THEN NULL ELSE "Embedding"::public.vector(72) END);
            """);

        migrationBuilder.Sql(
            """
            CREATE INDEX IF NOT EXISTS "IX_Books_Embedding_hnsw"
            ON crud."Books" USING hnsw ("Embedding" public.vector_cosine_ops) WITH (m = 16, ef_construction = 64);
            """);

        migrationBuilder.Sql(
            """
            CREATE INDEX IF NOT EXISTS "IX_Posts_Embedding_hnsw"
            ON crud."Posts" USING hnsw ("Embedding" public.vector_cosine_ops) WITH (m = 16, ef_construction = 64);
            """);

        migrationBuilder.Sql(
            """
            CREATE INDEX IF NOT EXISTS "IX_Communities_Embedding_hnsw"
            ON crud."Communities" USING hnsw ("Embedding" public.vector_cosine_ops) WITH (m = 16, ef_construction = 64);
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        throw new NotSupportedException(
            "Rolling back pgvector embedding columns is not supported; restore from backup if needed.");
    }
}
