import { AvatarFallback, AvatarImage, color } from 'folds';
import type { ReactEventHandler, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { roomGradientCss } from '$utils/roomGradient';
import { useRenderableMediaUrl } from '$hooks/useRenderableMediaUrl';
import * as css from './UserAvatar.css';

type UserAvatarProps = {
  className?: string;
  userId: string;
  src?: string;
  alt?: string;
  fallbackColor?: string;
  renderFallback: () => ReactNode;
};

const handleImageLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
  evt.currentTarget.setAttribute('data-image-loaded', 'true');
};

export function UserAvatar({
  className,
  userId,
  src,
  alt,
  fallbackColor,
  renderFallback,
}: UserAvatarProps) {
  const [error, setError] = useState(false);
  const resolvedSrc = useRenderableMediaUrl(src);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <AvatarFallback
        style={
          // fallbackColor is an explicit per-message override and still wins;
          // otherwise a person gets the same deterministic gradient a room
          // does, so a chat list looks like one designed set rather than two.
          fallbackColor
            ? { backgroundColor: fallbackColor, color: color.Surface.Container }
            : { background: roomGradientCss(userId), color: '#FFFFFF' }
        }
        className={classNames(css.UserAvatar, className)}
      >
        {renderFallback()}
      </AvatarFallback>
    );
  }

  return (
    <AvatarImage
      className={classNames(css.UserAvatar, className)}
      src={resolvedSrc ?? src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
      onLoad={handleImageLoad}
      draggable={false}
    />
  );
}
