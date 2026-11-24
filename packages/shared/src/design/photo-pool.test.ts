import { describe, expect, it } from 'vitest';
import { addToPhotoPool, PHOTO_POOL_MAX, removeFromPhotoPool } from './photo-pool.js';

describe('photo pool', () => {
  it('adds the newest photo last and ignores one that is already there', () => {
    expect(addToPhotoPool(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(addToPhotoPool(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });

  it('keeps at most six, dropping the oldest', () => {
    const full = ['1', '2', '3', '4', '5', '6'];
    expect(full).toHaveLength(PHOTO_POOL_MAX);
    expect(addToPhotoPool(full, '7')).toEqual(['2', '3', '4', '5', '6', '7']);
  });

  it('does not change the list it was given', () => {
    const cur = ['a'];
    addToPhotoPool(cur, 'b');
    removeFromPhotoPool(cur, 'a');
    expect(cur).toEqual(['a']);
  });

  it('removes a photo from the card', () => {
    expect(removeFromPhotoPool(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(removeFromPhotoPool(['a'], 'zzz')).toEqual(['a']);
  });
});
