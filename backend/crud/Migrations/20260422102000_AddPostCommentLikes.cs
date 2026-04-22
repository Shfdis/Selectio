using crud.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace crud.Migrations;

[DbContext(typeof(CrudDbContext))]
[Migration("20260422102000_AddPostCommentLikes")]
public partial class AddPostCommentLikes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PostCommentLikes",
            schema: "crud",
            columns: table => new
            {
                CommentId = table.Column<int>(type: "integer", nullable: false),
                UserId = table.Column<int>(type: "integer", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PostCommentLikes", x => new { x.CommentId, x.UserId });
                table.ForeignKey(
                    name: "FK_PostCommentLikes_PostComments_CommentId",
                    column: x => x.CommentId,
                    principalSchema: "crud",
                    principalTable: "PostComments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_PostCommentLikes_UserId",
            schema: "crud",
            table: "PostCommentLikes",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_PostCommentLikes_UserId_CommentId",
            schema: "crud",
            table: "PostCommentLikes",
            columns: new[] { "UserId", "CommentId" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "PostCommentLikes",
            schema: "crud");
    }
}

