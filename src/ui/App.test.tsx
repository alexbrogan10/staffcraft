// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { STORAGE_KEY } from './state/worksheetState';

const previewText = () => screen.getByRole('tabpanel').textContent;

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
  });

  it('shows a live preview that follows the title', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getAllByRole('img', { name: /Worksheet, page 1/ })).toHaveLength(1);

    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Week 3 Quiz');
    expect(previewText()).toContain('Week 3 Quiz');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      title: 'Week 3 Quiz',
    });
  });

  it('switches between the worksheet and the answer key', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(previewText()).not.toContain('ANSWER KEY');
    await user.click(screen.getByRole('tab', { name: /Answer key/ }));
    expect(previewText()).toContain('ANSWER KEY');
  });

  it('adds, edits and removes exercises', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Note Naming/ }));
    expect(screen.getAllByRole('heading', { level: 3, name: 'Note Naming' })).toHaveLength(2);

    // Default is 12 questions each; shrink the second exercise to 4.
    const questions = screen.getAllByLabelText<HTMLInputElement>('Questions')[1];
    if (!questions) throw new Error('missing second Questions field');
    await user.clear(questions);
    await user.type(questions, '4');
    expect(previewText()).toContain('16.');
    expect(previewText()).not.toContain('17.');

    for (const button of screen.getAllByRole('button', { name: 'Remove Note Naming' })) {
      await user.click(button);
    }
    expect(screen.getByText('No exercises yet. Add one below.')).toBeDefined();
    expect(screen.getByRole('button', { name: /Download PDF/ })).toHaveProperty('disabled', true);
  });

  it('changes the questions when a new seed is drawn', async () => {
    const user = userEvent.setup();
    render(<App />);
    const seed = screen.getByLabelText<HTMLInputElement>('Seed');
    const before = seed.value;
    await user.click(screen.getByRole('button', { name: /New questions/ }));
    expect(seed.value).not.toBe(before);
    expect(within(screen.getByRole('tabpanel')).getAllByRole('img').length).toBeGreaterThan(0);
  });
});
