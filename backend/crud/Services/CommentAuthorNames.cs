using crud.Data;
using Microsoft.EntityFrameworkCore;

namespace crud.Services;

internal static class CommentAuthorNames
{
    public static async Task<Dictionary<int, string>> ResolveAsync(
        CrudDbContext db,
        IEnumerable<int> userIds,
        CancellationToken cancellationToken = default)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<int, string>();
        }

        var fromProfiles = await db.UserProfiles
            .Where(u => ids.Contains(u.UserId))
            .ToDictionaryAsync(u => u.UserId, u => u.Username, cancellationToken);

        var result = new Dictionary<int, string>(ids.Count);
        foreach (var id in ids)
        {
            if (fromProfiles.TryGetValue(id, out var name) && !string.IsNullOrEmpty(name))
            {
                result[id] = name;
            }
            else
            {
                result[id] = $"user{id}";
            }
        }

        return result;
    }
}
