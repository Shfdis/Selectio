using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace crud.Migrations
{
    /// <inheritdoc />
    public partial class AddUserBookAddedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AddedAt",
                schema: "crud",
                table: "UserBooks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE crud."UserBooks"
                SET "AddedAt" = (NOW() AT TIME ZONE 'UTC')
                WHERE "AddedAt" IS NULL;
                """
            );

            migrationBuilder.AlterColumn<DateTime>(
                name: "AddedAt",
                schema: "crud",
                table: "UserBooks",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddedAt",
                schema: "crud",
                table: "UserBooks");
        }
    }
}
