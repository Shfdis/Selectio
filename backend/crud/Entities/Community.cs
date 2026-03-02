namespace crud.Entities;

public class Community
{
    public const int EmbeddingDimensions = 72;

    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CoverUrl { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public int OwnerUserId { get; set; }
    public float[]? Embedding { get; set; }
}

