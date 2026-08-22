import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { CreateProjectForm } from './CreateProject';
import type { ProjectRecord } from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { createRoom, createProject, addChainAsset } = vi.hoisted(() => ({
  createRoom: vi.fn<(mx: unknown, params: unknown) => Promise<string>>(),
  createProject:
    vi.fn<(mx: unknown, params: { slug: string; name: string }) => Promise<ProjectRecord>>(),
  addChainAsset:
    vi.fn<
      (
        mx: unknown,
        projectId: number,
        params: { chain: string; contractAddress: string }
      ) => Promise<unknown>
    >(),
}));

vi.mock('$components/create-room', () => ({
  createRoom,
  CreateRoomAccess: { Private: 'Private' },
}));

vi.mock('$utils/blockwire/projects', () => ({ createProject, addChainAsset }));

afterEach(() => {
  vi.clearAllMocks();
});

const madeProject: ProjectRecord = {
  project_id: 42,
  slug: 'my-project',
  name: 'My Project',
  ticker: null,
  description: null,
  avatar_url: null,
  banner_url: null,
  space_room_id: '!new:blockwire.chat',
  owner_mxid: '@owner:blockwire.chat',
  status: 'active',
  owner_verification_state: 'unverified',
  created_at: new Date().toISOString(),
};

// jsdom lacks named form-element properties (form.nameInput), same
// documented workaround as SecretStorage.test.tsx.
const submitForm = (form: HTMLFormElement) => {
  form.querySelectorAll('input, textarea').forEach((el) => {
    Object.defineProperty(form, (el as HTMLInputElement).name, { value: el, configurable: true });
  });
  fireEvent.submit(form);
};

describe('CreateProjectForm', () => {
  it('never shows a "slug" field or the word "slug" anywhere -- it is generated silently, not something a founder should ever have to see or think about', () => {
    render(<CreateProjectForm />);
    expect(screen.queryByText(/slug/i)).not.toBeInTheDocument();
    expect(screen.getByText('Project Name')).toBeInTheDocument();
  });

  it('lets a founder attach a contract address at creation time, not as a separate later step', async () => {
    createRoom.mockResolvedValue('!new:blockwire.chat');
    createProject.mockResolvedValue(madeProject);
    addChainAsset.mockResolvedValue({});
    const onCreate = vi.fn<(project: ProjectRecord) => void>();

    render(<CreateProjectForm onCreate={onCreate} />);
    fireEvent.change(screen.getByPlaceholderText(/wclaw labs/i), {
      target: { value: 'My Project' },
    });
    fireEvent.change(screen.getByPlaceholderText(/solana token address/i), {
      target: { value: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    });
    submitForm(screen.getByRole('button', { name: /create project/i }).closest('form')!);

    await waitFor(() => expect(createProject).toHaveBeenCalled());
    await waitFor(() =>
      expect(addChainAsset).toHaveBeenCalledWith(mockMatrixClient, 42, {
        chain: 'solana',
        contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      })
    );
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(madeProject));
  });

  it('creates the project fine with no contract address -- it is optional, not required', async () => {
    createRoom.mockResolvedValue('!new:blockwire.chat');
    createProject.mockResolvedValue(madeProject);

    render(<CreateProjectForm />);
    fireEvent.change(screen.getByPlaceholderText(/wclaw labs/i), {
      target: { value: 'My Project' },
    });
    submitForm(screen.getByRole('button', { name: /create project/i }).closest('form')!);

    await waitFor(() => expect(createProject).toHaveBeenCalled());
    expect(addChainAsset).not.toHaveBeenCalled();
  });

  it('a failed contract-address add does not undo an otherwise-successful project creation', async () => {
    createRoom.mockResolvedValue('!new:blockwire.chat');
    createProject.mockResolvedValue(madeProject);
    addChainAsset.mockRejectedValue(new Error('Could not add this chain asset.'));
    const onCreate = vi.fn<(project: ProjectRecord) => void>();

    render(<CreateProjectForm onCreate={onCreate} />);
    fireEvent.change(screen.getByPlaceholderText(/wclaw labs/i), {
      target: { value: 'My Project' },
    });
    fireEvent.change(screen.getByPlaceholderText(/solana token address/i), {
      target: { value: 'bad-address' },
    });
    submitForm(screen.getByRole('button', { name: /create project/i }).closest('form')!);

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(madeProject));
  });

  it('generates a real slug from the name behind the scenes, sent to the server but never shown', async () => {
    createRoom.mockResolvedValue('!new:blockwire.chat');
    createProject.mockResolvedValue(madeProject);

    render(<CreateProjectForm />);
    fireEvent.change(screen.getByPlaceholderText(/wclaw labs/i), {
      target: { value: 'My Cool Project!!' },
    });
    submitForm(screen.getByRole('button', { name: /create project/i }).closest('form')!);

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith(
        mockMatrixClient,
        expect.objectContaining({ slug: 'my-cool-project' })
      )
    );
  });
});
