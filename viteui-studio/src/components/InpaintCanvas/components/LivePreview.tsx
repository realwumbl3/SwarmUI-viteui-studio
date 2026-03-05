// Live preview overlay for the inpaint canvas
import styled, { keyframes } from 'styled-components';
import type { Bounds, CanvasBounds } from '../../../types/components';

interface LivePreviewProps {
    bounds: CanvasBounds;
    maskBorderMode: boolean;
    showBorder: boolean;
    livePreview: string | null;
    previewMaskSnapshot: string | null;
}

const LivePreview = ({
    bounds,
    maskBorderMode,
    showBorder,
    livePreview,
    previewMaskSnapshot,
}: LivePreviewProps) => {
    // Create preview overlay
    let previewOverlay: React.ReactNode = null;
    let livePreviewElement = <img
        src={livePreview ?? undefined}
        alt="Live preview"
        className="w-full h-full object-contain shadow-studio-border rounded-lg overflow-hidden"
        draggable={false}
        style={{
            visibility: livePreview ? 'visible' : 'hidden',
            imageRendering: 'auto',
        }}
    />

    if (previewMaskSnapshot) {
        previewOverlay = (
            <MaskedLivePreviewContainer $maskSrc={previewMaskSnapshot}>
                {livePreviewElement}
                <MaskedLivePreviewGradient />
            </MaskedLivePreviewContainer>
        );
    } else {
        previewOverlay = (
            <div
                className="absolute pointer-events-none w-full h-full inset-0 flex place-items-center"
            >
                {livePreviewElement}
            </div>
        );
    }


    // Outer overlay = padding (what the model uses)
    const padding = bounds.padding;
    if (!padding) {
        return previewOverlay;
    }

    const outerBorderStyle = {
        top: `${padding.y}px`,
        left: `${padding.x}px`,
        width: `${padding.width}px`,
        height: `${padding.height}px`
    };

    return (
        <div className="absolute inset-0 pointer-events-none">
            {maskBorderMode && <DisplayBoundsOverlay bounds={padding} />}

            {showBorder && <div className="absolute inset-0 pointer-events-none rounded-md outline outline-[2px] outline-offset-[2px] outline-white mix-blend-difference"
                style={outerBorderStyle}
            ></div>}
            <div className="absolute inset-0 pointer-events-none rounded-md"
                style={outerBorderStyle}
            >{previewOverlay}</div>

            {
                showBorder && bounds.mask && (
                    <div
                        className="absolute outline-dashed outline-white mix-blend-difference rounded-sm"
                        style={{
                            top: `${bounds.mask.y}px`,
                            left: `${bounds.mask.x}px`,
                            width: `${bounds.mask.width}px`,
                            height: `${bounds.mask.height}px`,
                            outlineWidth: '2px',
                            outlineOffset: '2px',
                            opacity: 0.4,
                        }}
                    />
                )
            }
        </div >
    );
};

const maskedPreviewSwipeAnimation = keyframes`
    from {
        background-position: -200% 0;
    }
    to {
        background-position: 200% 0;
    }
`;

const MaskedLivePreviewContainer = styled.div<{ $maskSrc: string }>`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: flex;
    place-items: center;
    justify-content: center;
    overflow: hidden;
    mask-image: url(${(props) => props.$maskSrc});
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: cover;
    -webkit-mask-image: url(${(props) => props.$maskSrc});
    -webkit-mask-position: center;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-size: cover;
`;

const MaskedLivePreviewGradient = styled.div`
    position: absolute;
    inset: 0;
    background-image: linear-gradient(125deg, transparent 15%, #ffffff 17%, transparent 45%);
    background-size: 200% 100%;
    background-repeat: no-repeat;
    animation: ${maskedPreviewSwipeAnimation} 3s linear forwards;
    animation-iteration-count: 3;
    mix-blend-mode: overlay;
    opacity: 1;
    z-index: 2;
    pointer-events: none;
    mask: inherit;
    -webkit-mask: inherit;
`;

const Blinder = styled.div`
    position: absolute;
    background-color: var(--studio-bg);
`;

const DisplayBoundsOverlay = ({
    bounds,
}: {
    bounds: Bounds;
}) => (
    <div style={{ opacity: 0.9 }}>
        {bounds.y > 0 && (
            <Blinder
                style={{
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${Math.max(0, bounds.y)}px`,
                }}
            />
        )}
        <Blinder
            style={{
                top: `${bounds.y + bounds.height}px`,
                left: 0,
                width: '100%',
                height: '10000px',
            }}
        />
        {bounds.x > 0 && (
            <Blinder
                style={{
                    top: 0,
                    left: 0,
                    width: `${Math.max(0, bounds.x)}px`,
                    height: '100%',
                }}
            />
        )}
        <Blinder
            style={{
                top: 0,
                left: `${bounds.x + bounds.width}px`,
                width: '10000px',
                height: '100%',
            }}
        />
    </div>
);

export default LivePreview;