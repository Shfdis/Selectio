using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace crud.Migrations
{
    /// <inheritdoc />
    public partial class ExcludeSeenContentOptimizations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Posts_CommunityId_Status_CreatedAt_Id",
                schema: "crud",
                table: "Posts",
                columns: new[] { "CommunityId", "Status", "CreatedAt", "Id" },
                descending: new[] { false, false, true, true });

            migrationBuilder.CreateIndex(
                name: "IX_PostLikes_UserId_PostId",
                schema: "crud",
                table: "PostLikes",
                columns: new[] { "UserId", "PostId" });

            migrationBuilder.CreateIndex(
                name: "IX_PostComments_AuthorUserId_PostId",
                schema: "crud",
                table: "PostComments",
                columns: new[] { "AuthorUserId", "PostId" });

            migrationBuilder.CreateIndex(
                name: "IX_BookComments_AuthorUserId_BookId",
                schema: "crud",
                table: "BookComments",
                columns: new[] { "AuthorUserId", "BookId" });

            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_Posts_Embedding_hnsw_published"
                ON crud."Posts" USING hnsw ("Embedding" public.vector_cosine_ops)
                WHERE "Status" = 0 AND "Embedding" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Posts_CommunityId_Status_CreatedAt_Id",
                schema: "crud",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_PostLikes_UserId_PostId",
                schema: "crud",
                table: "PostLikes");

            migrationBuilder.DropIndex(
                name: "IX_PostComments_AuthorUserId_PostId",
                schema: "crud",
                table: "PostComments");

            migrationBuilder.DropIndex(
                name: "IX_BookComments_AuthorUserId_BookId",
                schema: "crud",
                table: "BookComments");

            migrationBuilder.Sql("""DROP INDEX IF EXISTS crud."IX_Posts_Embedding_hnsw_published";""");
        }
    }
}
