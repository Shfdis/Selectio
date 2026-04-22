namespace gateway;

public static class GatewayAuthzClassifier
{
    public static AuthzRequirement Classify(string method, string path)
    {
        if (path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase))
        {
            return AuthzRequirement.Public;
        }

        if (path.Contains("/suggestions", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.Moderator;
        if (path.EndsWith("/approve", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.Moderator;
        if (path.EndsWith("/reject", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.Moderator;

        if (HttpMethods.IsGet(method))
        {
            if (path.Equals("/api/users/favorites", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
            if (path.Equals("/api/users/me/book-comments", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
            if (path.Equals("/api/users/me/feed", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
            if (path.Equals("/api/books/recommended", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
            if (path.StartsWith("/api/books", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.Public;
            if (path.Equals("/api/posts/recommended", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
            if (path.StartsWith("/api/communities", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.Public;
            if (path.StartsWith("/api/users/", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.Public;
            if (path.StartsWith("/api/posts/", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.Public;
            if (path.Contains("/comments", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.Public;
        }

        if (path.Equals("/api/auth/me", StringComparison.OrdinalIgnoreCase))
        {
            return AuthzRequirement.User;
        }

        if (path.Equals("/api/users/profile", StringComparison.OrdinalIgnoreCase) && HttpMethods.IsPut(method))
        {
            return AuthzRequirement.User;
        }

        if (path.Contains("/library", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
        if (path.EndsWith("/join", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
        if (path.EndsWith("/leave", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
        if (path.Equals("/api/posts", StringComparison.OrdinalIgnoreCase) && HttpMethods.IsPost(method)) return AuthzRequirement.User;
        if (path.Equals("/api/posts/suggest", StringComparison.OrdinalIgnoreCase) && HttpMethods.IsPost(method)) return AuthzRequirement.User;
        if (path.StartsWith("/api/posts/", StringComparison.OrdinalIgnoreCase) && path.EndsWith("/like", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
        if (path.StartsWith("/api/comments/", StringComparison.OrdinalIgnoreCase) && path.EndsWith("/like", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
        if (path.StartsWith("/api/posts/", StringComparison.OrdinalIgnoreCase) && path.EndsWith("/favorite", StringComparison.OrdinalIgnoreCase)) return AuthzRequirement.User;
        if (path.StartsWith("/api/posts/", StringComparison.OrdinalIgnoreCase) && path.EndsWith("/comments", StringComparison.OrdinalIgnoreCase) && HttpMethods.IsPost(method)) return AuthzRequirement.User;
        if (path.StartsWith("/api/books/", StringComparison.OrdinalIgnoreCase) && path.EndsWith("/comments", StringComparison.OrdinalIgnoreCase) && HttpMethods.IsPost(method)) return AuthzRequirement.User;
        if (path.Equals("/api/communities", StringComparison.OrdinalIgnoreCase) && HttpMethods.IsPost(method)) return AuthzRequirement.User;

        if (path.StartsWith("/api/posts/", StringComparison.OrdinalIgnoreCase) && (HttpMethods.IsPut(method) || HttpMethods.IsDelete(method)))
        {
            return AuthzRequirement.Owner;
        }

        if (path.StartsWith("/api/comments/", StringComparison.OrdinalIgnoreCase) && (HttpMethods.IsPut(method) || HttpMethods.IsDelete(method)))
        {
            return AuthzRequirement.Owner;
        }

        if (path.StartsWith("/api/book-comments/", StringComparison.OrdinalIgnoreCase) && (HttpMethods.IsPut(method) || HttpMethods.IsDelete(method)))
        {
            return AuthzRequirement.Owner;
        }

        if ((HttpMethods.IsPut(method) || HttpMethods.IsDelete(method)) && TrySingleIdPath(path, "/api/communities/", out _))
        {
            return AuthzRequirement.Owner;
        }

        return AuthzRequirement.User;
    }

    public static bool IsGetPostById(string method, string path, out int postId)
    {
        postId = default;
        if (!HttpMethods.IsGet(method)) return false;
        if (!path.StartsWith("/api/posts/", StringComparison.OrdinalIgnoreCase)) return false;

        var rest = path["/api/posts/".Length..];
        if (rest.Contains('/')) return false;
        return int.TryParse(rest, out postId);
    }

    public static bool TryGetIdFromPrefix(string path, string prefix, out int id)
    {
        id = default;
        if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var rest = path[prefix.Length..];
        var idText = rest.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return int.TryParse(idText, out id);
    }

    /// <summary>True when path is exactly /prefix{id} with no further path segments (e.g. /api/communities/12).</summary>
    private static bool TrySingleIdPath(string path, string prefix, out int id)
    {
        id = default;
        if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var rest = path[prefix.Length..];
        if (rest.Contains('/'))
        {
            return false;
        }

        return int.TryParse(rest, out id);
    }
}

