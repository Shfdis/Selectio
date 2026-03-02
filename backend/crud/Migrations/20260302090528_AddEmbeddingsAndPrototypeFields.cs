using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace crud.Migrations
{
    /// <inheritdoc />
    public partial class AddEmbeddingsAndPrototypeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "crud");

            migrationBuilder.RenameTable(
                name: "UserProfiles",
                newName: "UserProfiles",
                newSchema: "crud");

            migrationBuilder.RenameTable(
                name: "UserBooks",
                newName: "UserBooks",
                newSchema: "crud");

            migrationBuilder.RenameTable(
                name: "Posts",
                newName: "Posts",
                newSchema: "crud");

            migrationBuilder.RenameTable(
                name: "PostLikes",
                newName: "PostLikes",
                newSchema: "crud");

            migrationBuilder.RenameTable(
                name: "PostComments",
                newName: "PostComments",
                newSchema: "crud");

            migrationBuilder.RenameTable(
                name: "FavoritePosts",
                newName: "FavoritePosts",
                newSchema: "crud");

            migrationBuilder.RenameTable(
                name: "CommunityMembers",
                newName: "CommunityMembers",
                newSchema: "crud");

            migrationBuilder.RenameTable(
                name: "Communities",
                newName: "Communities",
                newSchema: "crud");

            migrationBuilder.RenameTable(
                name: "Books",
                newName: "Books",
                newSchema: "crud");

            migrationBuilder.RenameTable(
                name: "BookComments",
                newName: "BookComments",
                newSchema: "crud");

            migrationBuilder.AddColumn<float[]>(
                name: "Embedding",
                schema: "crud",
                table: "Posts",
                type: "real[]",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoUrl",
                schema: "crud",
                table: "Posts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoverUrl",
                schema: "crud",
                table: "Communities",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<float[]>(
                name: "Embedding",
                schema: "crud",
                table: "Communities",
                type: "real[]",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Genre",
                schema: "crud",
                table: "Communities",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<float[]>(
                name: "Embedding",
                schema: "crud",
                table: "Books",
                type: "real[]",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "ReleaseDate",
                schema: "crud",
                table: "Books",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Embedding",
                schema: "crud",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "PhotoUrl",
                schema: "crud",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "CoverUrl",
                schema: "crud",
                table: "Communities");

            migrationBuilder.DropColumn(
                name: "Embedding",
                schema: "crud",
                table: "Communities");

            migrationBuilder.DropColumn(
                name: "Genre",
                schema: "crud",
                table: "Communities");

            migrationBuilder.DropColumn(
                name: "Embedding",
                schema: "crud",
                table: "Books");

            migrationBuilder.DropColumn(
                name: "ReleaseDate",
                schema: "crud",
                table: "Books");

            migrationBuilder.RenameTable(
                name: "UserProfiles",
                schema: "crud",
                newName: "UserProfiles");

            migrationBuilder.RenameTable(
                name: "UserBooks",
                schema: "crud",
                newName: "UserBooks");

            migrationBuilder.RenameTable(
                name: "Posts",
                schema: "crud",
                newName: "Posts");

            migrationBuilder.RenameTable(
                name: "PostLikes",
                schema: "crud",
                newName: "PostLikes");

            migrationBuilder.RenameTable(
                name: "PostComments",
                schema: "crud",
                newName: "PostComments");

            migrationBuilder.RenameTable(
                name: "FavoritePosts",
                schema: "crud",
                newName: "FavoritePosts");

            migrationBuilder.RenameTable(
                name: "CommunityMembers",
                schema: "crud",
                newName: "CommunityMembers");

            migrationBuilder.RenameTable(
                name: "Communities",
                schema: "crud",
                newName: "Communities");

            migrationBuilder.RenameTable(
                name: "Books",
                schema: "crud",
                newName: "Books");

            migrationBuilder.RenameTable(
                name: "BookComments",
                schema: "crud",
                newName: "BookComments");
        }
    }
}
