using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace auth.Models;

[Table("tokens")]
public class Token
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public string JwtToken { get; set; } = string.Empty;

    [Required]
    public DateTime CreatedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public bool IsRevoked { get; set; } = false;

    [ForeignKey(nameof(UserId))]
    public VerifiedUser? User { get; set; }
}
