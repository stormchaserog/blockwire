import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type {
  ProjectChainAsset,
  ProjectLinkRecord,
  ProjectRecord,
} from '$utils/blockwire/projects';
import { ProjectInfoSheet } from './ProjectInfoSheet';

vi.mock('./ProjectChainAssetPrice', () => ({
  ProjectChainAssetPrice: () => <div>price-card</div>,
}));

const project: ProjectRecord = {
  project_id: 7,
  slug: 'wif-hat',
  name: 'dogwifhat',
  ticker: 'WIF',
  description: null,
  avatar_url: null,
  banner_url: null,
  space_room_id: '!space:blockwire.chat',
  owner_mxid: '@owner:blockwire.chat',
  status: 'active',
  owner_verification_state: 'verified',
  created_at: '2024-05-21T12:00:00Z',
};

const asset: ProjectChainAsset = {
  id: 1,
  project_id: 7,
  chain: 'solana',
  contract_address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  token_symbol: 'WIF',
  token_decimals: 6,
  verified_control_state: 'verified',
  created_at: '2024-05-21T12:00:00Z',
};

const links: ProjectLinkRecord[] = [
  {
    id: 1,
    project_id: 7,
    link_type: 'website',
    url: 'https://dogwifcoin.org/about',
    verification_state: 'verified',
    created_at: '2024-05-21T12:00:00Z',
  },
  {
    id: 2,
    project_id: 7,
    link_type: 'x',
    url: 'https://x.com/dogwifcoin',
    verification_state: 'verified',
    created_at: '2024-05-21T12:00:00Z',
  },
];

function renderSheet(overrides?: {
  project?: ProjectRecord;
  chainAssets?: ProjectChainAsset[];
  links?: ProjectLinkRecord[];
  onClose?: () => void;
}) {
  return render(
    <MemoryRouter>
      <ProjectInfoSheet
        project={overrides?.project ?? project}
        chainAssets={overrides?.chainAssets ?? [asset]}
        links={overrides?.links ?? links}
        selectedAsset={overrides?.chainAssets?.[0] ?? (overrides?.chainAssets ? null : asset)}
        spaceRoomId="!space:blockwire.chat"
        onClose={overrides?.onClose ?? vi.fn<() => void>()}
      />
    </MemoryRouter>
  );
}

describe('ProjectInfoSheet', () => {
  it('renders the project name with its ticker-and-chain line, chain capitalized', () => {
    renderSheet();

    expect(screen.getByText('dogwifhat')).toBeInTheDocument();
    expect(screen.getByText('$WIF • Solana')).toBeInTheDocument();
  });

  it('shows the Verified Project chip only for a verified owner state', () => {
    renderSheet();

    expect(screen.getByText('Verified Project')).toBeInTheDocument();
  });

  it('omits the Verified Project chip for an unverified project', () => {
    renderSheet({ project: { ...project, owner_verification_state: 'unverified' } });

    expect(screen.queryByText('Verified Project')).not.toBeInTheDocument();
  });

  it('truncates the contract address to first 3 and last 4 characters', () => {
    renderSheet();

    expect(screen.getByText('EKp…zcjm')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy contract address')).toBeInTheDocument();
  });

  it('renders website hostname and X handle rows from the official links', () => {
    renderSheet();

    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('dogwifcoin.org')).toBeInTheDocument();
    expect(screen.getByText('X (Twitter)')).toBeInTheDocument();
    expect(screen.getByText('@dogwifcoin')).toBeInTheDocument();
  });

  it('renders First Seen from created_at in long date form', () => {
    renderSheet();

    expect(screen.getByText('First Seen')).toBeInTheDocument();
    expect(screen.getByText('May 21, 2024')).toBeInTheDocument();
  });

  it('omits contract, chain, explorer, website, X, and first-seen rows when their data is missing', () => {
    renderSheet({
      project: { ...project, ticker: null, created_at: '' },
      chainAssets: [],
      links: [],
    });

    expect(screen.queryByText('Contract Address')).not.toBeInTheDocument();
    expect(screen.queryByText('Chain')).not.toBeInTheDocument();
    expect(screen.queryByText('Explorer')).not.toBeInTheDocument();
    expect(screen.queryByText('Website')).not.toBeInTheDocument();
    expect(screen.queryByText('X (Twitter)')).not.toBeInTheDocument();
    expect(screen.queryByText('First Seen')).not.toBeInTheDocument();
    // No asset means no Chart tile either -- there is no address to chart.
    expect(screen.queryByText('Chart')).not.toBeInTheDocument();
  });

  it('links Chart to DexScreener and Explorer to Solscan for a solana asset', () => {
    renderSheet();

    expect(screen.getByText('Chart').closest('a')).toHaveAttribute(
      'href',
      `https://dexscreener.com/solana/${asset.contract_address}`
    );
    expect(screen.getByText('Solscan').closest('a')).toHaveAttribute(
      'href',
      `https://solscan.io/token/${asset.contract_address}`
    );
  });

  it('fires onClose when the Close button is pressed', () => {
    const onClose = vi.fn<() => void>();
    renderSheet({ onClose });

    fireEvent.click(screen.getByText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
