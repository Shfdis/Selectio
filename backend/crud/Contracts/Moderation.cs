namespace crud.Contracts;

public sealed record ModerationDecisionResponse(
    int PostId,
    string Status
);

