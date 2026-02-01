declare namespace naver.maps {
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
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map | null;
    icon?: string | ImageIcon | HtmlIcon;
    zIndex?: number;
    title?: string;
    clickable?: boolean;
    visible?: boolean;
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
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getMap(): Map | null;
    getPosition(): LatLng;
    setPosition(position: LatLng): void;
    setIcon(icon: string | ImageIcon | HtmlIcon): void;
    setVisible(visible: boolean): void;
    setZIndex(zIndex: number): void;
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

  class Event {
    static addListener(
      target: unknown,
      type: string,
      listener: (...args: unknown[]) => void,
    ): void;
    static removeListener(listener: unknown): void;
    static clearListeners(target: unknown, type: string): void;
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
