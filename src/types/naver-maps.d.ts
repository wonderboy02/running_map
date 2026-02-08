declare namespace naver.maps {
  // Map Type IDs
  const MapTypeId: {
    NORMAL: string;
    SATELLITE: string;
    HYBRID: string;
    TERRAIN: string;
  };

  // Animation constants
  const Animation: {
    BOUNCE: number;
    DROP: number;
  };

  // Zoom control styles
  const ZoomControlStyle: {
    SMALL: number;
    LARGE: number;
  };

  interface MapOptions {
    center?: LatLng;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    pinchZoom?: boolean;
    scrollWheel?: boolean;
    disableKineticPan?: boolean;
    zoomControl?: boolean;
    zoomControlOptions?: {
      position?: number;
      style?: number;
    };
    mapTypeId?: string;
    mapTypeControl?: boolean;
    scaleControl?: boolean;
    tileTransition?: boolean;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map | null;
    icon?: string | ImageIcon | HtmlIcon | SymbolIcon;
    zIndex?: number;
    title?: string;
    clickable?: boolean;
    visible?: boolean;
    animation?: number;
  }

  interface ImageIcon {
    url?: string;
    content?: string;
    size?: Size;
    anchor?: Point;
    scaledSize?: Size;
  }

  interface HtmlIcon {
    content: string;
    size?: Size;
    anchor?: Point;
  }

  interface SymbolIcon {
    path: string | number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
    scale?: number;
    rotation?: number;
    anchor?: Point;
  }

  class Map {
    constructor(element: HTMLElement | string, options?: MapOptions);
    getCenter(): LatLng;
    setCenter(center: LatLng): void;
    getZoom(): number;
    setZoom(zoom: number): void;
    getBounds(): LatLngBounds;
    panTo(coord: LatLng, options?: unknown): void;
    destroy(): void;
    setOptions(options: Partial<MapOptions>): void;
    setMapTypeId(mapTypeId: string): void;
    getMapTypeId(): string;
    addControl(control: CustomControl, position: number): void;
    removeControl(control: CustomControl): void;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getMap(): Map | null;
    getPosition(): LatLng;
    setPosition(position: LatLng): void;
    setIcon(icon: string | ImageIcon | HtmlIcon | SymbolIcon): void;
    setVisible(visible: boolean): void;
    setZIndex(zIndex: number): void;
    setAnimation(animation: number | null): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  class LatLngBounds {
    constructor(sw: LatLng, ne: LatLng);
    extend(latlng: LatLng): LatLngBounds;
    hasLatLng(latlng: LatLng): boolean;
  }

  class Point {
    constructor(x: number, y: number);
  }

  class Size {
    constructor(width: number, height: number);
  }

  class CustomControl {
    constructor(html: string, options?: { position?: number });
    setMap(map: Map | null): void;
    getElement(): HTMLElement;
  }

  class Event {
    static addListener(
      target: unknown,
      type: string,
      listener: (...args: unknown[]) => void
    ): void;
    static removeListener(listener: unknown): void;
    static clearListeners(target: unknown, type: string): void;
    static trigger(target: unknown, type: string, ...args: unknown[]): void;
  }

  interface GroundOverlayOptions {
    opacity?: number;
    clickable?: boolean;
    map?: Map;
    crossOrigin?: string;
  }

  class GroundOverlay {
    constructor(
      url: string,
      bounds: LatLngBounds,
      options?: GroundOverlayOptions
    );
    setMap(map: Map | null): void;
    getMap(): Map | null;
    setOpacity(opacity: number): void;
    getOpacity(): number;
    setUrl(url: string): void;
    setBounds(bounds: LatLngBounds): void;
    getBounds(): LatLngBounds;
    setClickable(clickable: boolean): void;
    getClickable(): boolean;
  }

  // Position constants
  const Position: {
    TOP_LEFT: number;
    TOP_CENTER: number;
    TOP_RIGHT: number;
    LEFT_CENTER: number;
    CENTER: number;
    RIGHT_CENTER: number;
    BOTTOM_LEFT: number;
    BOTTOM_CENTER: number;
    BOTTOM_RIGHT: number;
  };
}

interface Window {
  naver: typeof naver;
  navermap_authFailure?: () => void;
}
