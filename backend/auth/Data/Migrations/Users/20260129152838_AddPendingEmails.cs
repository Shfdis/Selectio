using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace auth.Data.Migrations.Users
{
    /// <inheritdoc />
    public partial class AddPendingEmails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pending_emails",
                columns: table => new
                {
                    Uuid = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Username = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pending_emails", x => x.Uuid);
                });

            migrationBuilder.CreateIndex(
                name: "IX_pending_emails_Email",
                table: "pending_emails",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_pending_emails_Uuid",
                table: "pending_emails",
                column: "Uuid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pending_emails");
        }
    }
}
