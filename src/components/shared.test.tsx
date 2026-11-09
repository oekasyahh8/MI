import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NoData } from './shared';

describe('data-dependent empty state', () => {
  it('clearly prompts for a real dataset instead of showing sample metrics', () => {
    render(<MemoryRouter><NoData /></MemoryRouter>);
    expect(screen.getByText('Belum ada data untuk ditampilkan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buka Data Management/i })).toHaveAttribute('href', '/data');
  });
});
