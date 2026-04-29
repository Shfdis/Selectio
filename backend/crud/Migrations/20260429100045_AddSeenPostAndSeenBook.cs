using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace crud.Migrations
{
    /// <inheritdoc />
    public partial class AddSeenPostAndSeenBook : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SeenBooks",
                schema: "crud",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    BookId = table.Column<int>(type: "integer", nullable: false),
                    SeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeenBooks", x => new { x.UserId, x.BookId });
                    table.ForeignKey(
                        name: "FK_SeenBooks_Books_BookId",
                        column: x => x.BookId,
                        principalSchema: "crud",
                        principalTable: "Books",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SeenPosts",
                schema: "crud",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    PostId = table.Column<int>(type: "integer", nullable: false),
                    SeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeenPosts", x => new { x.UserId, x.PostId });
                    table.ForeignKey(
                        name: "FK_SeenPosts_Posts_PostId",
                        column: x => x.PostId,
                        principalSchema: "crud",
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SeenBooks_BookId",
                schema: "crud",
                table: "SeenBooks",
                column: "BookId");

            migrationBuilder.CreateIndex(
                name: "IX_SeenBooks_UserId_SeenAt",
                schema: "crud",
                table: "SeenBooks",
                columns: new[] { "UserId", "SeenAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SeenPosts_PostId",
                schema: "crud",
                table: "SeenPosts",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_SeenPosts_UserId_SeenAt",
                schema: "crud",
                table: "SeenPosts",
                columns: new[] { "UserId", "SeenAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SeenBooks",
                schema: "crud");

            migrationBuilder.DropTable(
                name: "SeenPosts",
                schema: "crud");
        }
    }
}
