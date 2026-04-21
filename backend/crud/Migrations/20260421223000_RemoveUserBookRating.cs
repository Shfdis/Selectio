using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace crud.Migrations;

public partial class RemoveUserBookRating : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "Rating",
            schema: "crud",
            table: "UserBooks");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "Rating",
            schema: "crud",
            table: "UserBooks",
            type: "integer",
            nullable: true);
    }
}
