import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManageProjectPanel } from './ManageProjectPanel';

vi.mock('./AddChainAssetForm', () => ({
  AddChainAssetForm: () => <div>chain-asset-form</div>,
}));
vi.mock('./AddProjectLinkForm', () => ({
  AddProjectLinkForm: () => <div>project-link-form</div>,
}));

describe('ManageProjectPanel', () => {
  it('keeps both management forms collapsed by default -- this panel is only ever shown to admins, but it should not shout at them either', () => {
    render(<ManageProjectPanel projectId={42} onDetailsChanged={vi.fn<() => void>()} />);

    expect(screen.getByText('Add a Token')).toBeInTheDocument();
    expect(screen.getByText('Add an Official Link')).toBeInTheDocument();
    expect(screen.queryByText('chain-asset-form')).not.toBeInTheDocument();
    expect(screen.queryByText('project-link-form')).not.toBeInTheDocument();
  });

  it('reveals the chain asset form independently of the link form when its header is clicked', () => {
    render(<ManageProjectPanel projectId={42} onDetailsChanged={vi.fn<() => void>()} />);

    fireEvent.click(screen.getByText('Add a Token'));

    expect(screen.getByText('chain-asset-form')).toBeInTheDocument();
    expect(screen.queryByText('project-link-form')).not.toBeInTheDocument();
  });
});
