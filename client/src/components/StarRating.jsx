import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, count = 0, size = 'sm', interactive = false, onChange }) {
  const stars = [1, 2, 3, 4, 5];
  const starSize = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-0.5">
      {stars.map(s => (
        <button
          key={s}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(s)}
          className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
        >
          <Star
            className={`${starSize} ${
              s <= Math.round(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
      {count > 0 && (
        <span className="ml-1.5 text-sm text-gray-500">({count.toLocaleString()})</span>
      )}
    </div>
  );
}
