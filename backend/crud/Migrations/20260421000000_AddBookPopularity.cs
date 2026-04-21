using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace crud.Migrations;

public partial class AddBookPopularity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "Popularity",
            schema: "crud",
            table: "Books",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.Sql(
            """
            CREATE INDEX IF NOT EXISTS "IX_Books_Popularity_Id"
            ON crud."Books" ("Popularity" DESC, "Id" ASC);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP INDEX IF EXISTS crud."IX_Books_Popularity_Id";
            """);

        migrationBuilder.DropColumn(
            name: "Popularity",
            schema: "crud",
            table: "Books");
    }
}
