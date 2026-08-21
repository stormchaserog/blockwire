import { Box, Text, color, config } from 'folds';
import {
  Globe,
  XLogo,
  RedditLogo,
  GithubLogo,
  ArrowSquareOut,
  Link as LinkIcon,
  sizedIcon,
} from '$components/icons/phosphor';
import type { ProjectLinkRecord } from '$utils/blockwire/projects';
import { VerificationBadge } from './VerificationBadge';

/** UI Bible §13: "Projects maintain clearly identified official links...
 *  must be visually distinguishable from links posted by normal users."
 *  The container background (SurfaceVariant) plus per-type icon is that
 *  distinguishing treatment -- an official link never looks like a plain
 *  inline chat link. */

function iconForLinkType(linkType: string) {
  switch (linkType.toLowerCase()) {
    case 'website':
      return Globe;
    case 'x':
    case 'twitter':
      return XLogo;
    case 'reddit':
      return RedditLogo;
    case 'github':
      return GithubLogo;
    default:
      return LinkIcon;
  }
}

function labelForLinkType(linkType: string): string {
  switch (linkType.toLowerCase()) {
    case 'x':
    case 'twitter':
      return 'X';
    default:
      // 'website' -> 'Website', 'discord' -> 'Discord', etc. Anything the
      // server accepts as a link_type (see projects.ts's link-type
      // normalization) that isn't one of the named cases above still gets
      // a readable label rather than falling through to raw lowercase text.
      return linkType.charAt(0).toUpperCase() + linkType.slice(1);
  }
}

export type OfficialLinksVaultProps = {
  links: ProjectLinkRecord[];
};

/** Renders nothing when a project has no official links yet -- same
 *  progressive-disclosure principle as ProjectIdentitySection itself:
 *  an empty vault is not a broken or half-finished project, it's simply
 *  a project that hasn't added links, and should not grow an empty-state
 *  card competing for space in the Lobby. */
export function OfficialLinksVault({ links }: OfficialLinksVaultProps) {
  if (links.length === 0) return null;

  return (
    <Box direction="Column" gap="200">
      <Text size="L400" style={{ color: color.Surface.OnContainer }}>
        Official Links
      </Text>
      <Box direction="Column" gap="100">
        {links.map((link) => (
          <Box
            key={link.id}
            as="a"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            alignItems="Center"
            justifyContent="SpaceBetween"
            gap="200"
            style={{
              padding: `${config.space.S200} ${config.space.S300}`,
              borderRadius: config.radii.R400,
              backgroundColor: color.SurfaceVariant.Container,
              textDecoration: 'none',
            }}
          >
            <Box alignItems="Center" gap="200">
              {sizedIcon(iconForLinkType(link.link_type), '100')}
              <Text size="T300" style={{ color: color.Surface.OnContainer }}>
                {labelForLinkType(link.link_type)}
              </Text>
              <VerificationBadge state={link.verification_state} label="Owner Verified" />
            </Box>
            {sizedIcon(ArrowSquareOut, '50', { style: { color: color.Surface.OnContainer } })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
