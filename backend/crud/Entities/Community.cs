namespace crud.Entities;

public class Community
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public int OwnerUserId { get; set; }
}

