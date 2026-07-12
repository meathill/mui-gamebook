import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StarRating from './StarRating';

describe('StarRating', () => {
  it('渲染 5 颗星，初始全部为空心', () => {
    render(<StarRating onRate={vi.fn()} />);

    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(5);
    for (const star of stars) {
      expect(star).toHaveTextContent('☆');
    }
  });

  it('鼠标悬停在第 3 颗星时，前 3 颗高亮，之后的仍为空心', () => {
    render(<StarRating onRate={vi.fn()} />);
    const stars = screen.getAllByRole('button');

    fireEvent.mouseEnter(stars[2]);

    expect(stars[0]).toHaveTextContent('⭐');
    expect(stars[1]).toHaveTextContent('⭐');
    expect(stars[2]).toHaveTextContent('⭐');
    expect(stars[3]).toHaveTextContent('☆');
    expect(stars[4]).toHaveTextContent('☆');
  });

  it('鼠标移出后悬停高亮消失（未选中时恢复全空心）', () => {
    render(<StarRating onRate={vi.fn()} />);
    const stars = screen.getAllByRole('button');

    fireEvent.mouseEnter(stars[2]);
    fireEvent.mouseLeave(stars[2]);

    expect(stars[0]).toHaveTextContent('☆');
  });

  it('点击第 4 颗星调用 onRate(4) 并固定高亮到已选中的星级', () => {
    const onRate = vi.fn();
    render(<StarRating onRate={onRate} />);
    const stars = screen.getAllByRole('button');

    fireEvent.click(stars[3]);

    expect(onRate).toHaveBeenCalledWith(4);
    expect(stars[3]).toHaveTextContent('⭐');

    fireEvent.mouseLeave(stars[3]);
    expect(stars[3]).toHaveTextContent('⭐');
  });

  it('disabled 时点击/悬停都不生效', () => {
    const onRate = vi.fn();
    render(
      <StarRating
        onRate={onRate}
        disabled
      />,
    );
    const stars = screen.getAllByRole('button');

    fireEvent.mouseEnter(stars[2]);
    fireEvent.click(stars[2]);

    expect(onRate).not.toHaveBeenCalled();
    expect(stars[2]).toHaveTextContent('☆');
    expect(stars[0]).toBeDisabled();
  });
});
