namespace crud.Entities;

public enum LibraryStatus
{
    WantToRead = 0,
    Reading = 1,
    Read = 2
}

public class UserBook
{
    public int UserId { get; set; }
    public int BookId { get; set; }

    public LibraryStatus Status { get; set; } = LibraryStatus.WantToRead;
    public int? Rating { get; set; }

    public Book? Book { get; set; }
}

