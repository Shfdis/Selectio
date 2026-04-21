using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using crud.Data;

#nullable disable

namespace crud.Migrations;

[DbContext(typeof(CrudDbContext))]
[Migration("20260421223000_RemoveUserBookRating")]
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
