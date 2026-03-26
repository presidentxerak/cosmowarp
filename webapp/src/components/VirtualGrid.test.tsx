import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VirtualGrid from './VirtualGrid';

describe('VirtualGrid', () => {
  it('shows empty message when no items', () => {
    render(
      <VirtualGrid
        items={[]}
        columns={3}
        rowHeight={200}
        renderItem={(item: string) => <div>{item}</div>}
        emptyMessage="Nothing here"
      />
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders items in a grid', () => {
    const items = Array.from({ length: 6 }, (_, i) => `Item ${i}`);
    const { container } = render(
      <VirtualGrid
        items={items}
        columns={3}
        rowHeight={100}
        renderItem={(item: string, index: number) => <div key={index} data-testid={`item-${index}`}>{item}</div>}
      />
    );
    // The container should have the virtualizer wrapper
    expect(container.querySelector('[style*="position: relative"]')).toBeTruthy();
  });

  it('exports as default', async () => {
    const mod = await import('./VirtualGrid');
    expect(typeof mod.default).toBe('function');
  });
});
