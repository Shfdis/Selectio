using Pgvector;

namespace crud.Entities;

public class Book
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public string SecondGenre { get; set; } = string.Empty;
    public string CoverUrl { get; set; } = string.Empty;
    public DateOnly? ReleaseDate { get; set; }
    public int Popularity { get; set; }
    public Vector? Embedding { get; set; }
}

