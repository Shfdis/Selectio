using crud.Entities;

namespace crud.Contracts;

public sealed record BookDto(
    int Id,
    string Title,
    string Author,
    string Description,
    string Genre,
    string SecondGenre,
    string CoverUrl,
    DateOnly? ReleaseDate,
    double? AverageRating,
    LibraryStatus? UserStatus,
    int? UserRating
);

