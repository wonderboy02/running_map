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
    mapDataControl?: boolean;
    logoControl?: boolean;
    logoControlOptions?: { position?: number };
    gl?: boolean;
    customStyleId?: string;
  }

  interface TransitionOptions {
    duration?: number;
    easing?: string;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map | null;
    icon?: string | ImageIcon | HtmlIcon | SymbolIcon;
    zIndex?: number;
    title?: string;
    clickable?: boolean;
    draggable?: boolean;
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
    data: Data;
    getCenter(): LatLng;
    setCenter(center: LatLng): void;
    getZoom(): number;
    setZoom(zoom: number): void;
    getBounds(): LatLngBounds;
    panTo(coord: LatLng, transitionOptions?: TransitionOptions): void;
    panToBounds(
      bounds: LatLngBounds,
      transitionOptions?: TransitionOptions,
      margin?: { top?: number; right?: number; bottom?: number; left?: number },
    ): void;
    morph(coord: LatLng, zoom?: number, transitionOptions?: TransitionOptions): void;
    fitBounds(bounds: LatLngBounds, options?: { padding?: number }): void;
    getProjection(): MapSystemProjection;
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
    x: number;
    y: number;
  }

  interface MapSystemProjection {
    fromCoordToOffset(coord: LatLng): Point;
    fromOffsetToCoord(offset: Point): LatLng;
    fromCoordToPoint(coord: LatLng): Point;
    fromPointToCoord(point: Point): LatLng;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class CustomControl {
    constructor(html: string, options?: { position?: number });
    setMap(map: Map | null): void;
    getElement(): HTMLElement;
  }

  interface MapEventListener {
    eventName: string;
    target: unknown;
    listener: (...args: any[]) => void;
  }

  class Event {
    static addListener(
      target: unknown,
      type: string,
      listener: (...args: any[]) => void,
    ): MapEventListener;
    static removeListener(listener: MapEventListener): void;
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

  interface CircleOptions {
    center: LatLng;
    radius?: number;
    map?: Map | null;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    fillColor?: string;
    fillOpacity?: number;
    clickable?: boolean;
    zIndex?: number;
    visible?: boolean;
  }

  class Circle {
    constructor(options: CircleOptions);
    setMap(map: Map | null): void;
    getMap(): Map | null;
    setCenter(center: LatLng): void;
    getCenter(): LatLng;
    setRadius(radius: number): void;
    getRadius(): number;
    setVisible(visible: boolean): void;
    setOptions(options: Partial<CircleOptions>): void;
  }

  // --- Data Layer ---

  namespace Data {
    interface StyleOptions {
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeLineCap?: string;
      strokeLineJoin?: string;
      clickable?: boolean;
      visible?: boolean;
      zIndex?: number;
      icon?: string | ImageIcon | HtmlIcon;
      title?: string | null;
      shape?: unknown;
    }

    type StylingFunction = (feature: Feature) => StyleOptions;

    class Feature {
      getId(): string | number;
      getProperty(key: string): unknown;
      setProperty(key: string, value: unknown): void;
      getGeometries(): unknown[];
      /** 내부 GeoJSON Feature 객체를 반환 */
      getRaw(): { geometry?: { type?: string }; [key: string]: unknown };
    }
  }

  class Data {
    constructor();
    addGpx(xmlDoc: Document, autoStyle?: boolean): Data.Feature[];
    addGeoJson(geojson: object, autoStyle?: boolean): Data.Feature[];
    addKml(xmlDoc: Document, autoStyle?: boolean): Data.Feature[];
    addFeature(feature: Data.Feature, autoStyle?: boolean): Data.Feature;
    removeFeature(feature: Data.Feature): void;
    getAllFeature(): Data.Feature[];
    getFeatureById(id: string | number): Data.Feature | null;
    forEach(callback: (info: { feature: Data.Feature; index: number }) => void): void;
    setStyle(style: Data.StyleOptions | Data.StylingFunction): void;
    getStyle(): Data.StyleOptions | Data.StylingFunction;
    overrideStyle(feature: Data.Feature, style: Data.StyleOptions): void;
    revertStyle(feature?: Data.Feature): void;
    setMap(map: Map | null): void;
    getMap(): Map | null;
    toGeoJson(): object;
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
