using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace crud.Migrations
{
    /// <inheritdoc />
    public partial class CommunityGenresArray : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string[]>(
                name: "Genres",
                schema: "crud",
                table: "Communities",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            migrationBuilder.Sql(
                """
                UPDATE crud."Communities"
                SET "Genres" = CASE
                    WHEN NULLIF(BTRIM("Genre"), '') IS NULL THEN '{}'::text[]
                    ELSE ARRAY[BTRIM("Genre")]::text[]
                END;
                """
            );

            migrationBuilder.DropColumn(
                name: "Genre",
                schema: "crud",
                table: "Communities");

            migrationBuilder.CreateIndex(
                name: "IX_Communities_Genres",
                schema: "crud",
                table: "Communities",
                column: "Genres")
                .Annotation("Npgsql:IndexMethod", "gin");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Communities_Genres",
                schema: "crud",
                table: "Communities");

            migrationBuilder.AddColumn<string>(
                name: "Genre",
                schema: "crud",
                table: "Communities",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(
                """
                UPDATE crud."Communities"
                SET "Genre" = COALESCE("Genres"[1], '');
                """
            );

            migrationBuilder.DropColumn(
                name: "Genres",
                schema: "crud",
                table: "Communities");
        }
    }
}
