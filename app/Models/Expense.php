<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFarm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Dépense d'exploitation : semences, carburant, main-d'œuvre, achat d'eau…
 *
 * @property int $id
 * @property int $farm_id
 * @property int|null $campaign_id
 * @property int $user_id
 * @property string $expense_date
 * @property float $amount
 * @property string $category
 * @property string|null $description
 * @property string|null $receipt_path
 */
class Expense extends Model
{
    use BelongsToFarm;

    protected $fillable = [
        'farm_id',
        'campaign_id',
        'user_id',
        'expense_date',
        'amount',
        'category',
        'description',
        'receipt_path',
    ];

    protected function casts(): array
    {
        return [
            'expense_date' => 'date',
            'amount' => 'float',
        ];
    }

    /** @return BelongsTo<Farm, $this> */
    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Campaign, $this> */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }
}
