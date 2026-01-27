using crud.Entities;
using Microsoft.EntityFrameworkCore;

namespace crud.Data;

public static class CrudSeed
{
    public static async Task SeedAsync(CrudDbContext db)
    {
        if (await db.Books.AnyAsync())
        {
            return;
        }

        db.Books.AddRange(
            new Book
            {
                Title = "The Hobbit",
                Author = "J.R.R. Tolkien",
                Description = "A reluctant hobbit is swept into an adventure to reclaim a lost dwarven kingdom.",
                Genre = "Fantasy",
                CoverUrl = ""
            },
            new Book
            {
                Title = "1984",
                Author = "George Orwell",
                Description = "A dystopian novel about surveillance, control, and truth.",
                Genre = "Dystopian",
                CoverUrl = ""
            },
            new Book
            {
                Title = "Pride and Prejudice",
                Author = "Jane Austen",
                Description = "A classic story of love, misunderstanding, and social expectations.",
                Genre = "Classic",
                CoverUrl = ""
            },
            new Book
            {
                Title = "Dune",
                Author = "Frank Herbert",
                Description = "Politics, prophecy, and power struggles on the desert planet Arrakis.",
                Genre = "Science Fiction",
                CoverUrl = ""
            },
            new Book
            {
                Title = "To Kill a Mockingbird",
                Author = "Harper Lee",
                Description = "A coming-of-age story set against racial injustice in the American South.",
                Genre = "Classic",
                CoverUrl = ""
            }
        );

        await db.SaveChangesAsync();
    }
}

