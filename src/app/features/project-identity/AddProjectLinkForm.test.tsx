import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { AddProjectLinkForm } from './AddProjectLinkForm';
import type { ProjectLinkRecord } from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { addProjectLink } = vi.hoisted(() => ({
  addProjectLink:
    vi.fn<
      (
        mx: unknown,
        projectId: number,
        params: { linkType: string; url: string }
      ) => Promise<ProjectLinkRecord>
    >(),
}));

vi.mock('$utils/blockwire/projects', () => ({ addProjectLink }));

afterEach(() => {
  vi.clearAllMocks();
});

const madeLink: ProjectLinkRecord = {
  id: 3,
  project_id: 42,
  link_type: 'x',
  url: 'https://x.com/blockwire',
  verification_state: 'unverified',
  created_at: new Date().toISOString(),
};

// jsdom lacks named form-element properties (form.urlInput), which the
// component relies on in real browsers -- same documented workaround as
// SecretStorage.test.tsx / AddChainAssetForm.test.tsx.
const submitForm = (form: HTMLFormElement) => {
  form.querySelectorAll('input').forEach((input) => {
    Object.defineProperty(form, input.name, { value: input, configurable: true });
  });
  fireEvent.submit(form);
};

describe('AddProjectLinkForm', () => {
  it('is disabled without a URL -- addProjectLink() is never called for an empty submission', () => {
    const onAdded = vi.fn<(link: ProjectLinkRecord) => void>();
    render(<AddProjectLinkForm projectId={42} onAdded={onAdded} />);

    submitForm(screen.getByRole('button', { name: /add link/i }).closest('form')!);

    expect(addProjectLink).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('defaults to the Website link type, and switching the type picker changes what gets submitted', async () => {
    addProjectLink.mockResolvedValue(madeLink);
    const onAdded = vi.fn<(link: ProjectLinkRecord) => void>();
    render(<AddProjectLinkForm projectId={42} onAdded={onAdded} />);

    // Switch off the default "Website" selection to "X".
    fireEvent.click(screen.getByRole('button', { name: 'X' }));
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: madeLink.url },
    });
    submitForm(screen.getByRole('button', { name: /add link/i }).closest('form')!);

    await waitFor(() => expect(onAdded).toHaveBeenCalledWith(madeLink));
    expect(addProjectLink).toHaveBeenCalledWith(mockMatrixClient, 42, {
      linkType: 'x',
      url: madeLink.url,
    });
  });

  it('surfaces a server error instead of silently failing', async () => {
    addProjectLink.mockRejectedValue(new Error('Could not add this link.'));
    render(
      <AddProjectLinkForm projectId={42} onAdded={vi.fn<(link: ProjectLinkRecord) => void>()} />
    );

    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com' },
    });
    submitForm(screen.getByRole('button', { name: /add link/i }).closest('form')!);

    expect(await screen.findByText('Could not add this link.')).toBeInTheDocument();
  });
});
