"""Curated additions and repeatable primary-source license checks for Featured.

Run with --verify to refresh evidence, then --write to publish verified rows.
No GitHub API token is required; checks read each project's own source files.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import argparse
import json
import re
import requests

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {
    'animation': 'Animation & effects', 'charts': 'Charts & visualization',
    'tables': 'Tables & data grids', 'forms': 'Forms & inputs',
    'editors': 'Editors & builders', 'media': 'Media & carousels',
    'icons': 'Icons & illustrations', 'layout': 'Drag, drop & layout',
    'dates': 'Calendars & dates', 'maps': 'Maps', 'canvas': 'Canvas & 3D',
    'mobile': 'Mobile UI', 'solid': 'Solid',
    'feedback': 'Feedback & overlays',
}
EXCLUDED = {
    'suid': 'The former documentation domain redirects away from the project.',
    'horizon-ui': 'The documentation endpoint is unavailable.',
    'pluralsight-design-system': 'The former website now describes a different design system.',
    'tsparticles': 'The available documentation favicon is the Astro scaffold icon.',
    'react-zoom-pan-pinch': 'The documentation favicon belongs to Storybook.',
    'react-simple-maps': 'The documentation favicon belongs to Vercel.',
    'react-multi-date-picker': 'The documentation favicon belongs to Gatsby.',
    'react-modal': 'The documentation favicon belongs to the documentation theme.',
    'react-spinners': 'The available favicon identifies the author rather than this library.',
    'hamburgers': 'The available favicon identifies the author rather than this library.',
    'vanta-js': 'The available favicon identifies the author rather than this library.',
}
URL_OVERRIDES = {
    'react-data-grid': 'https://github.com/adazzle/react-data-grid',
    'roughviz': 'https://github.com/jwilber/roughViz',
    'react-big-calendar': 'https://github.com/jquense/react-big-calendar',
    'duet-date-picker': 'https://github.com/duetds/date-picker',
    'hope-ui': 'https://github.com/hope-ui/hope-ui',
    'lenis': 'https://lenis.dev/',
    'lottie-web': 'https://lottie.airbnb.tech/',
    'visx': 'https://visx.airbnb.tech/',
    'primevue': 'https://primevue.dev/',
    'primeng': 'https://primeng.dev/',
    'react-intersection-observer': 'https://react-intersection-observer.thebuilder.dk/',
}

# name | official documentation | source repository | original summary
DATA = r'''
[animation]
Motion|https://motion.dev/|motiondivision/motion|Production animation, gestures, and layout transitions for the web.
React Spring|https://www.react-spring.dev/|pmndrs/react-spring|Spring physics animation primitives for React interfaces.
Anime.js|https://animejs.com/|juliangarnier/anime|JavaScript animation for CSS, SVG, DOM attributes, and objects.
AutoAnimate|https://auto-animate.formkit.com/|formkit/auto-animate|Automatic enter, leave, and rearrangement animations.
React Transition Group|https://reactcommunity.org/react-transition-group/|reactjs/react-transition-group|Lifecycle components for coordinating React transitions.
Popmotion|https://popmotion.io/|Popmotion/popmotion|Composable animation functions, springs, and value interpolation.
Theatre.js|https://www.theatrejs.com/|theatre-js/theatre|A visual timeline and animation editor for creative web projects.
React Flip Toolkit|https://github.com/aholachek/react-flip-toolkit|aholachek/react-flip-toolkit|FLIP layout animations for React components and shared elements.
VueUse Motion|https://motion.vueuse.org/|vueuse/motion|Composable animation utilities and directives for Vue.
React Scroll Parallax|https://react-scroll-parallax.damnthat.tv/|jscottsmith/react-scroll-parallax|Scroll-driven parallax components and hooks for React.
Parallax.js|https://matthew.wagerfield.com/parallax/|wagerfield/parallax|Device orientation and pointer-driven parallax scenes.
Rellax|https://dixonandmoe.com/rellax/|dixonandmoe/rellax|Lightweight scroll parallax with responsive speed controls.
AOS|https://michalsnik.github.io/aos/|michalsnik/aos|Declarative animations triggered as elements enter the viewport.
Sal.js|https://mciastek.github.io/sal/|mciastek/sal|Small scroll animation library powered by Intersection Observer.
Locomotive Scroll|https://scroll.locomotive.ca/|locomotivemtl/locomotive-scroll|Smooth scrolling, scroll detection, and parallax effects.
Lenis|https://lenis.darkroom.engineering/|darkroomengineering/lenis|Smooth scrolling with accessible native browser behavior.
tsParticles|https://particles.js.org/|tsparticles/tsparticles|Configurable particle backgrounds with framework integrations.
Vanta.js|https://www.vantajs.com/|tengbao/vanta|Animated WebGL backgrounds that respond to pointer movement.
Granim.js|https://sarcadass.github.io/granim.js/|sarcadass/granim.js|Animated canvas gradients with interactive states.
Vivus|https://maxwellito.github.io/vivus/|maxwellito/vivus|SVG drawing animations with timing and path controls.
KUTE.js|https://thednp.github.io/kute.js/|thednp/kute.js|Tweening and SVG morphing for expressive web animation.
Lottie Web|https://airbnb.io/lottie/|airbnb/lottie-web|Render exported motion graphics as SVG, canvas, or HTML.
Lottie React|https://lottiereact.com/|Gamote/lottie-react|React components and hooks for interactive Lottie playback.
DotLottie Web|https://developers.lottiefiles.com/docs/dotlottie-player/dotlottie-web/|LottieFiles/dotlottie-web|A web player for the compact dotLottie animation format.
[charts]
D3|https://d3js.org/|d3/d3|Data-driven visualization primitives for SVG, canvas, and the DOM.
Chart.js|https://www.chartjs.org/|chartjs/Chart.js|Responsive canvas charts with plugins and animation.
Apache ECharts|https://echarts.apache.org/|apache/echarts|Interactive charts, dashboards, and large-scale data visualization.
Recharts|https://recharts.org/|recharts/recharts|Composable React chart components built on SVG.
Nivo|https://nivo.rocks/|plouc/nivo|Responsive React charts with SVG and canvas renderers.
Visx|https://airbnb.io/visx/|airbnb/visx|Low-level React visualization components powered by D3.
Victory|https://commerce.nearform.com/open-source/victory/|FormidableLabs/victory|Composable chart components for React applications.
Plotly.js|https://plotly.com/javascript/|plotly/plotly.js|Interactive scientific, statistical, and business charts.
uPlot|https://leeoniya.github.io/uPlot/|leeoniya/uPlot|Compact, fast canvas charts for time series and large datasets.
Chartist|https://chartist.dev/|chartist-js/chartist|Responsive SVG charts with flexible styling.
Billboard.js|https://naver.github.io/billboard.js/|naver/billboard.js|Reusable D3 charts with a simple configuration API.
C3.js|https://c3js.org/|c3js/c3|D3-based chart components with an accessible configuration layer.
Vega|https://vega.github.io/vega/|vega/vega|A declarative visualization grammar for interactive graphics.
Vega-Lite|https://vega.github.io/vega-lite/|vega/vega-lite|Concise specifications for layered and interactive visualizations.
Observable Plot|https://observablehq.com/plot/|observablehq/plot|A concise JavaScript library for exploratory charts.
Unovis|https://unovis.dev/|f5/unovis|Modular charts, maps, and network diagrams for multiple frameworks.
AntV G2|https://g2.antv.antgroup.com/|antvis/G2|A visualization grammar for interactive statistical graphics.
AntV G6|https://g6.antv.antgroup.com/|antvis/G6|Graph visualization and exploration with configurable layouts.
AntV F2|https://f2.antv.antgroup.com/|antvis/F2|Compact charts designed for mobile interfaces.
Semiotic|https://semiotic.nteract.io/|nteract/semiotic|React visualization frameworks for networks, XY plots, and ordinal data.
RoughViz|https://www.jwilber.me/roughViz/|jwilber/roughViz|Hand-drawn chart components for playful data visualization.
VChart|https://www.visactor.io/vchart|VisActor/VChart|Cross-platform charting with storytelling and animation features.
[tables]
TanStack Table|https://tanstack.com/table/latest|TanStack/table|Headless table logic for sorting, filtering, grouping, and pagination.
AG Grid Community|https://www.ag-grid.com/|ag-grid/ag-grid|A feature-rich community data grid with optional enterprise extensions.
React Data Grid|https://adazzle.github.io/react-data-grid/|adazzle/react-data-grid|Editable, virtualized React grids with keyboard navigation.
Glide Data Grid|https://grid.glideapps.com/|glideapps/glide-data-grid|A canvas-based React grid for large, editable datasets.
Material React Table|https://www.material-react-table.com/|KevinVandy/material-react-table|Material UI tables with integrated sorting, filtering, and editing.
Mantine React Table|https://www.mantine-react-table.com/|KevinVandy/mantine-react-table|Mantine data tables powered by TanStack Table.
Mantine DataTable|https://icflorescu.github.io/mantine-datatable/|icflorescu/mantine-datatable|Composable Mantine tables with pagination, selection, and expansion.
Tabulator|https://tabulator.info/|olifolkerd/tabulator|Interactive tables with editing, filtering, and data import.
Grid.js|https://gridjs.io/|grid-js/gridjs|Small framework-independent tables with search and pagination.
DataTables|https://datatables.net/|DataTables/DataTablesSrc|Progressive table enhancement with search, ordering, and pagination.
VTable|https://www.visactor.io/vtable|VisActor/VTable|Canvas-rendered tables and pivot tables for dense datasets.
React Data Table Component|https://react-data-table-component.netlify.app/|jbetancur/react-data-table-component|Declarative React tables with selection, expansion, and pagination.
React Virtualized|https://bvaughn.github.io/react-virtualized/|bvaughn/react-virtualized|Virtualized lists, tables, and grids for large collections.
React Window|https://react-window.vercel.app/|bvaughn/react-window|Efficient React rendering for long lists and grids.
TanStack Virtual|https://tanstack.com/virtual/latest|TanStack/virtual|Headless virtualization for scrollable lists and grids.
[forms]
React Hook Form|https://react-hook-form.com/|react-hook-form/react-hook-form|Performant React forms with validation and minimal rerenders.
Formik|https://formik.org/|jaredpalmer/formik|React form state, validation, and submission helpers.
TanStack Form|https://tanstack.com/form/latest|TanStack/form|Type-safe form state and validation across multiple frameworks.
Final Form|https://final-form.org/|final-form/final-form|Subscription-based form state with framework adapters.
FormKit|https://formkit.com/|formkit/formkit|Vue form inputs, validation, and schema-driven form generation.
Formily|https://formilyjs.org/|alibaba/formily|Schema-driven form building with reactive field management.
JSON Forms|https://jsonforms.io/|eclipsesource/jsonforms|JSON Schema forms for React, Angular, and Vue.
React JSON Schema Form|https://rjsf-team.github.io/react-jsonschema-form/|rjsf-team/react-jsonschema-form|Generate customizable React forms from JSON Schema.
Uniforms|https://uniforms.tools/|vazco/uniforms|Schema-driven React forms with multiple design-system integrations.
VeeValidate|https://vee-validate.logaretm.com/|logaretm/vee-validate|Vue form validation with composable fields and schema support.
Vuelidate|https://vuelidate-next.netlify.app/|vuelidate/vuelidate|Model-based validation for Vue form interfaces.
Svelte Superforms|https://superforms.rocks/|ciscoheat/sveltekit-superforms|Type-safe SvelteKit forms with validation and progressive enhancement.
Felte|https://felte.dev/|pablo-abc/felte|Extensible form management for Svelte, Solid, and React.
Modular Forms|https://modularforms.dev/|fabian-hiller/modular-forms|Typed, modular forms with framework-specific reactive bindings.
React Select|https://react-select.com/|JedWatson/react-select|Accessible select controls with search, async options, and multiselect.
Downshift|https://www.downshift-js.com/|downshift-js/downshift|Headless autocomplete, combobox, and select building blocks.
Tom Select|https://tom-select.js.org/|orchidjs/tom-select|Searchable select inputs with tags and plugin support.
Choices.js|https://choices-js.github.io/Choices/|Choices-js/Choices|Customizable select boxes and text inputs without jQuery.
Tagify|https://yaireo.github.io/tagify/|yairEO/tagify|Tag inputs with suggestions, validation, and mixed text support.
IMask|https://imask.js.org/|uNmAnNeR/imaskjs|Input masks for numbers, dates, currencies, and custom patterns.
[editors]
Tiptap|https://tiptap.dev/|ueberdosis/tiptap|A headless rich-text editor with an extensible open-source core.
Lexical|https://lexical.dev/|facebook/lexical|An extensible text editor framework with accessible interactions.
Slate|https://www.slatejs.org/|ianstormtaylor/slate|A customizable framework for building rich-text editors in React.
Quill|https://quilljs.com/|slab/quill|A modular rich-text editor with a document change API.
ProseMirror|https://prosemirror.net/|ProseMirror/prosemirror-view|A toolkit for structured rich-text editing and custom document models.
CodeMirror|https://codemirror.net/|codemirror/dev|An extensible browser code editor with language and theme support.
Monaco Editor|https://microsoft.github.io/monaco-editor/|microsoft/monaco-editor|The browser code editor that powers VS Code editing experiences.
Ace|https://ace.c9.io/|ajaxorg/ace|An embeddable code editor with syntax highlighting and language tools.
Editor.js|https://editorjs.io/|codex-team/editor.js|Block-style editing with structured JSON output.
BlockNote|https://www.blocknotejs.org/|TypeCellOS/BlockNote|A React block editor with collaboration and rich content support.
Plate|https://platejs.org/|udecode/plate|Composable plugins and components for Slate-based React editors.
Milkdown|https://milkdown.dev/|Milkdown/milkdown|A plugin-driven Markdown editor built on ProseMirror.
MDXEditor|https://mdxeditor.dev/|mdx-editor/editor|A React editor for Markdown, JSX, and rich content blocks.
TOAST UI Editor|https://ui.toast.com/tui-editor|nhn/tui.editor|Markdown and WYSIWYG editing with preview and extensions.
wangEditor|https://www.wangeditor.com/|wangeditor-team/wangEditor|A configurable rich-text editor with Vue and React integrations.
Jodit|https://xdsoft.net/jodit/|xdan/jodit|A WYSIWYG editor with a configurable toolbar and plugins.
GrapesJS|https://grapesjs.com/|GrapesJS/grapesjs|A visual page builder framework with reusable content blocks.
Craft.js|https://craft.js.org/|prevwong/craft.js|React primitives for creating drag-and-drop page editors.
Puck|https://puckeditor.com/|puckeditor/puck|A visual editor for assembling pages from your React components.
React Page|https://react-page.github.io/|react-page/react-page|A customizable React content editor with plugin-based cells.
[media]
Swiper|https://swiperjs.com/|nolimits4web/swiper|Touch sliders and carousels with framework components.
Embla Carousel|https://www.embla-carousel.com/|davidjerleke/embla-carousel|Lightweight carousels with precise motion and plugin support.
Keen Slider|https://keen-slider.io/|rcbyr/keen-slider|Responsive touch sliders with extensible movement behavior.
Splide|https://splidejs.com/|Splidejs/splide|Accessible sliders with autoplay, synchronization, and responsive options.
Glide.js|https://glidejs.com/|glidejs/glide|A dependency-free slider and carousel with modular extensions.
Flicking|https://naver.github.io/egjs-flicking/|naver/egjs-flicking|Flexible flickable carousels with circular and free scrolling.
PhotoSwipe|https://photoswipe.com/|dimsemenov/PhotoSwipe|Touch-friendly image galleries with zoom and animated transitions.
GLightbox|https://biati-digital.github.io/glightbox/|biati-digital/glightbox|Responsive lightboxes for images, video, and inline content.
Yet Another React Lightbox|https://yet-another-react-lightbox.com/|igordanchenko/yet-another-react-lightbox|React lightboxes with zoom, captions, and thumbnail plugins.
React Photo Album|https://react-photo-album.com/|igordanchenko/react-photo-album|Responsive photo layouts in rows, columns, and masonry.
Video.js|https://videojs.com/|videojs/video.js|An accessible HTML video player with a plugin ecosystem.
Plyr|https://plyr.io/|sampotts/plyr|Customizable controls for HTML video, audio, YouTube, and Vimeo.
Media Chrome|https://www.media-chrome.org/|muxinc/media-chrome|Composable web components for custom media player controls.
React Player|https://cookpete.github.io/react-player/|cookpete/react-player|A React player component for files and supported media services.
Wavesurfer.js|https://wavesurfer.xyz/|katspaugh/wavesurfer.js|Interactive audio waveforms with regions and playback controls.
Uppy|https://uppy.io/|transloadit/uppy|Modular file upload interfaces with previews and progress tracking.
FilePond|https://pqina.nl/filepond/|pqina/filepond|Polished file uploads with previews, validation, and plugins.
React Dropzone|https://react-dropzone.js.org/|react-dropzone/react-dropzone|React hooks for accessible drag-and-drop file uploads.
[icons]
Lucide|https://lucide.dev/|lucide-icons/lucide|Consistent line icons with packages for popular frameworks.
Tabler Icons|https://tabler.io/icons|tabler/tabler-icons|A large collection of editable SVG outline icons.
Heroicons|https://heroicons.com/|tailwindlabs/heroicons|Handcrafted outline and solid icons from the Tailwind team.
Phosphor Icons|https://phosphoricons.com/|phosphor-icons/core|Flexible icons in multiple weights for interfaces and diagrams.
Remix Icon|https://remixicon.com/|Remix-Design/RemixIcon|Neutral system icons in line and filled styles.
Feather|https://feathericons.com/|feathericons/feather|Simple, consistent SVG icons on a 24-pixel grid.
Bootstrap Icons|https://icons.getbootstrap.com/|twbs/icons|SVG icons usable with Bootstrap or any frontend stack.
Octicons|https://primer.style/octicons/|primer/octicons|GitHub's interface icons with SVG and React packages.
Ionicons|https://ionic.io/ionicons|ionic-team/ionicons|Interface icons designed for web and mobile applications.
Iconoir|https://iconoir.com/|iconoir-icons/iconoir|A broad collection of fine-line SVG interface icons.
Radix Icons|https://www.radix-ui.com/icons|radix-ui/icons|A crisp 15-pixel icon set for compact interface layouts.
CSS.gg|https://css.gg/|astrit/css.gg|Icons available as pure CSS, SVG, and component packages.
Flag Icons|https://flagicons.lipis.dev/|lipis/flag-icons|Country flag SVGs and CSS utilities for interfaces.
DiceBear|https://www.dicebear.com/|dicebear/dicebear|Procedural avatar generation with configurable visual styles.
Open Peeps|https://www.openpeeps.com/|pablostanley/open-peeps|Mix-and-match illustrated people for product and editorial design.
[layout]
dnd-kit|https://dndkit.com/|clauderic/dnd-kit|Accessible drag-and-drop primitives and sortable interactions for React.
Pragmatic Drag and Drop|https://atlassian.design/components/pragmatic-drag-and-drop/|atlassian/pragmatic-drag-and-drop|Flexible drag-and-drop building blocks from Atlassian.
SortableJS|https://sortablejs.github.io/Sortable/|SortableJS/Sortable|Reorderable lists with touch support and framework integrations.
React DnD|https://react-dnd.github.io/react-dnd/|react-dnd/react-dnd|React drag-and-drop interfaces with pluggable input backends.
React Grid Layout|https://react-grid-layout.github.io/react-grid-layout/|react-grid-layout/react-grid-layout|Responsive draggable and resizable dashboard layouts.
GridStack|https://gridstackjs.com/|gridstack/gridstack.js|Interactive dashboard grids with dragging, resizing, and nesting.
Moveable|https://daybrush.com/moveable/|daybrush/moveable|Drag, resize, rotate, and warp elements with interactive handles.
Interact.js|https://interactjs.io/|taye/interact.js|Drag, resize, multitouch gestures, and snapping for DOM elements.
React Rnd|https://github.com/bokuweb/react-rnd|bokuweb/react-rnd|A React component combining draggable and resizable behavior.
React Resizable Panels|https://react-resizable-panels.vercel.app/|bvaughn/react-resizable-panels|Accessible resizable panel groups for React application layouts.
Split.js|https://split.js.org/|nathancahill/split|Lightweight split views with draggable resizing gutters.
Allotment|https://allotment.mulberryhousesoftware.com/|johnwalley/allotment|Resizable split panes for React workspaces.
React Flow|https://reactflow.dev/|xyflow/xyflow|Interactive node editors, workflow diagrams, and graph interfaces.
Svelte Flow|https://svelteflow.dev/|xyflow/xyflow|Node-based editors and interactive diagrams for Svelte.
Rete.js|https://retejs.org/|retejs/rete|A framework for visual programming and node-based editors.
[dates]
FullCalendar|https://fullcalendar.io/|fullcalendar/fullcalendar|Interactive event calendars with views, dragging, and framework adapters.
React Big Calendar|https://jquense.github.io/react-big-calendar/|jquense/react-big-calendar|React event calendars with month, week, day, and agenda views.
DayPicker|https://daypicker.dev/|gpbl/react-day-picker|Customizable React calendars for single dates and date ranges.
React Datepicker|https://reactdatepicker.com/|Hacker0x01/react-datepicker|React date and time inputs with keyboard navigation.
Flatpickr|https://flatpickr.js.org/|flatpickr/flatpickr|Lightweight date and time pickers with localization and plugins.
Air Datepicker|https://air-datepicker.com/|t1m0n/air-datepicker|Configurable date and time pickers with range selection.
Vanilla Calendar Pro|https://vanilla-calendar.pro/|uvarov-frontend/vanilla-calendar-pro|Dependency-free calendar widgets with date and time selection.
Schedule-X|https://schedule-x.dev/|schedule-x/schedule-x|Modern event calendars with framework integrations and plugins.
TOAST UI Calendar|https://ui.toast.com/tui-calendar|nhn/tui.calendar|JavaScript calendars with schedule management and multiple views.
VCalendar|https://vcalendar.io/|nathanreyes/v-calendar|Vue calendars and date pickers with flexible date attributes.
Vue Datepicker|https://vue3datepicker.com/|Vuepic/vue-datepicker|Vue date and time pickers with ranges and custom slots.
React Multi Date Picker|https://shahabyazdi.github.io/react-multi-date-picker/|shahabyazdi/react-multi-date-picker|React date pickers supporting multiple calendars and selections.
[maps]
Leaflet|https://leafletjs.com/|Leaflet/Leaflet|Lightweight interactive maps with markers, tiles, and plugins.
MapLibre GL JS|https://maplibre.org/maplibre-gl-js/docs/|maplibre/maplibre-gl-js|GPU-rendered vector maps with an open-source web renderer.
OpenLayers|https://openlayers.org/|openlayers/openlayers|Maps with raster tiles, vector layers, projections, and interactions.
React Leaflet|https://react-leaflet.js.org/|PaulLeCam/react-leaflet|React components for Leaflet maps and map layers.
React Map GL|https://visgl.github.io/react-map-gl/|visgl/react-map-gl|React bindings for MapLibre and Mapbox map renderers.
deck.gl|https://deck.gl/|visgl/deck.gl|GPU-powered layers for large-scale geospatial visualization.
CesiumJS|https://cesium.com/platform/cesiumjs/|CesiumGS/cesium|Interactive 3D globes and geospatial scenes in the browser.
React Simple Maps|https://www.react-simple-maps.io/|zcreativelabs/react-simple-maps|Composable SVG map components for React.
Pigeon Maps|https://pigeon-maps.js.org/|mariusandra/pigeon-maps|Lightweight React maps with custom markers and overlays.
Maptalks|https://maptalks.org/|maptalks/maptalks.js|Interactive 2D and 3D maps with extensible rendering layers.
[canvas]
Three.js|https://threejs.org/|mrdoob/three.js|A JavaScript 3D engine for interactive WebGL scenes.
React Three Fiber|https://r3f.docs.pmnd.rs/|pmndrs/react-three-fiber|A React renderer for composing Three.js scenes.
Drei|https://drei.docs.pmnd.rs/|pmndrs/drei|Reusable helpers, controls, and abstractions for React Three Fiber.
Babylon.js|https://www.babylonjs.com/|BabylonJS/Babylon.js|A 3D engine with scene tools, materials, and WebXR support.
PixiJS|https://pixijs.com/|pixijs/pixijs|Fast 2D rendering for interactive graphics and visual interfaces.
Konva|https://konvajs.org/|konvajs/konva|Interactive canvas shapes, layers, and event handling.
Fabric.js|https://fabricjs.com/|fabricjs/fabric.js|An object model for editable canvas graphics and SVG import.
p5.js|https://p5js.org/|processing/p5.js|Creative coding primitives for interactive art and graphics.
Paper.js|https://paperjs.org/|paperjs/paper.js|Vector graphics scripting with paths, geometry, and canvas rendering.
Two.js|https://two.js.org/|jonobr1/two.js|A 2D drawing API with SVG, canvas, and WebGL renderers.
OGL|https://oframe.github.io/ogl/|oframe/ogl|A compact WebGL library for custom graphics and shaders.
TresJS|https://tresjs.org/|Tresjs/tres|Declarative Three.js scenes built with Vue components.
Threlte|https://threlte.xyz/|threlte/threlte|Declarative 3D scenes and interactions for Svelte.
model-viewer|https://modelviewer.dev/|google/model-viewer|A web component for interactive 3D models and augmented reality.
Excalidraw|https://docs.excalidraw.com/|excalidraw/excalidraw|An embeddable React whiteboard with a hand-drawn visual style.
[mobile]
React Native Paper|https://reactnativepaper.com/|callstack/react-native-paper|Material Design components for React Native applications.
React Native Elements|https://reactnativeelements.com/|react-native-elements/react-native-elements|Customizable cross-platform React Native interface components.
UI Kitten|https://akveo.github.io/react-native-ui-kitten/|akveo/react-native-ui-kitten|Themeable mobile components based on the Eva design system.
React Native UI Lib|https://wix.github.io/react-native-ui-lib/|wix/react-native-ui-lib|Mobile UI components, typography, layouts, and design tokens.
Magnus UI|https://magnus-ui.com/|jsartisan/react-native-magnus|Utility-driven React Native components for rapid mobile layouts.
React Native Reusables|https://reactnativereusables.com/|fondationio/react-native-reusables|Accessible NativeWind components inspired by shadcn/ui.
NativeWind|https://www.nativewind.dev/|nativewind/nativewind|Tailwind-style styling for native and web React interfaces.
Restyle|https://shopify.github.io/restyle/|Shopify/restyle|Type-safe themed building blocks for React Native.
Dripsy|https://www.dripsy.xyz/|nandorojo/dripsy|Responsive, themeable styling primitives for React Native and web.
Moti|https://moti.fyi/|nandorojo/moti|Declarative React Native animations powered by Reanimated.
React Native Reanimated|https://docs.swmansion.com/react-native-reanimated/|software-mansion/react-native-reanimated|Smooth native animations and gesture-driven interactions.
React Native Gesture Handler|https://docs.swmansion.com/react-native-gesture-handler/|software-mansion/react-native-gesture-handler|Native gesture recognition for touch-driven mobile interfaces.
React Native Bottom Sheet|https://gorhom.dev/react-native-bottom-sheet/|gorhom/react-native-bottom-sheet|Gesture-driven bottom sheets with snapping and scroll integration.
React Native Calendars|https://wix.github.io/react-native-calendars/|wix/react-native-calendars|Calendar, agenda, and date-selection components for React Native.
React Native Gifted Chat|https://github.com/FaridSafi/react-native-gifted-chat|FaridSafi/react-native-gifted-chat|Customizable messaging interfaces for React Native applications.
React Native Gifted Charts|https://gifted-charts.web.app/|Abhinandan-Kushwaha/react-native-gifted-charts|Animated charts for React Native dashboards and mobile interfaces.
React Native SVG|https://github.com/software-mansion/react-native-svg|software-mansion/react-native-svg|SVG components and vector rendering for React Native.
React Navigation|https://reactnavigation.org/|react-navigation/react-navigation|Stack, tab, and drawer navigation for React Native applications.
FlashList|https://shopify.github.io/flash-list/|Shopify/flash-list|High-performance recycling lists for React Native collections.
Legend List|https://legendapp.com/open-source/list/|LegendApp/legend-list|Fast, flexible lists for React Native and web interfaces.
[solid]
Kobalte|https://kobalte.dev/|kobaltedev/kobalte|Accessible unstyled primitives for Solid applications.
Corvu|https://corvu.dev/|corvudev/corvu|Accessible Solid primitives for complex interactive components.
SUID|https://suid.io/|swordev/suid|Material Design components implemented for Solid.
Solid UI|https://www.solid-ui.com/|stefan-karger/solid-ui|Composable Solid components inspired by shadcn/ui.
Hope UI|https://hope-ui.com/|hope-ui/hope-ui|Themeable and accessible components for Solid interfaces.
Solid Bootstrap|https://solid-libs.github.io/solid-bootstrap/|solid-libs/solid-bootstrap|Bootstrap components implemented with Solid reactivity.
Solid Toast|https://solid-toast.com/|ardeora/solid-toast|Configurable toast notifications for Solid applications.
[react]
Elastic UI|https://eui.elastic.co/|elastic/eui|React components and design patterns for data-rich applications.
Cloudscape|https://cloudscape.design/|cloudscape-design/components|AWS's open-source design system for cloud applications.
Polaris|https://polaris.shopify.com/|Shopify/polaris|Shopify's design system and interface components for commerce tools.
Paste|https://paste.twilio.design/|twilio-labs/paste|Accessible React components and design tokens from Twilio.
Horizon UI|https://horizon-ui.com/|horizon-ui/horizon-ui-chakra|Open-source React dashboard components with Chakra UI.
Semi Design|https://semi.design/|DouyinFE/semi-design|A broad React component system for application interfaces.
Arco Design React|https://arco.design/|arco-design/arco-design|React components and design resources for enterprise applications.
TDesign React|https://tdesign.tencent.com/react/|Tencent/tdesign-react|Tencent's React component library and enterprise design system.
Ring UI|https://jetbrains.github.io/ring-ui/|JetBrains/ring-ui|React components used in JetBrains web products.
Pluralsight Design System|https://design-system.pluralsight.com/|pluralsight/design-system|React components and design foundations for product interfaces.
[html]
Pico CSS|https://picocss.com/|picocss/pico|Minimal semantic HTML styling with responsive defaults.
Open Props|https://open-props.style/|argyleink/open-props|CSS custom properties for colors, spacing, shadows, and motion.
Pure.css|https://pure-css.github.io/|pure-css/pure|Small responsive CSS modules for grids, forms, and navigation.
Milligram|https://milligram.io/|milligram/milligram|A minimal CSS framework with typography, forms, and layout styles.
Water.css|https://watercss.kognise.dev/|kognise/water.css|Classless CSS themes for semantic HTML pages.
Simple.css|https://simplecss.org/|kevquirk/simple.css|A lightweight classless stylesheet for readable websites.
MVP.css|https://andybrewer.github.io/mvp/|andybrewer/mvp|Classless styles for building polished HTML prototypes quickly.
[vue]
PrimeVue|https://primevue.org/|primefaces/primevue|A broad suite of Vue components with styled and unstyled modes.
BootstrapVueNext|https://bootstrap-vue-next.github.io/bootstrap-vue-next/|bootstrap-vue-next/bootstrap-vue-next|Bootstrap 5 components for Vue 3 applications.
Buefy|https://buefy.org/|buefy/buefy|Lightweight Vue components styled with Bulma.
Inkline|https://www.inkline.io/|inkline/inkline|Vue components with configurable styling and design tokens.
Vue Material|https://vuematerial.io/|vuematerial/vue-material|Material Design components for Vue application interfaces.
[svelte]
Svelte UX|https://svelte-ux.techniq.dev/|techniq/svelte-ux|Svelte components and actions for building application interfaces.
Svelte Headless UI|https://svelte-headlessui.goss.io/|rgossiaux/svelte-headlessui|Unstyled, accessible component patterns for Svelte.
Svelte Sonner|https://svelte-sonner.vercel.app/|wobsoriano/svelte-sonner|Animated toast notifications for Svelte applications.
[angular]
PrimeNG|https://primeng.org/|primefaces/primeng|Angular application components with customizable themes.
NG Alain|https://ng-alain.com/|ng-alain/ng-alain|Angular enterprise application components and dashboard patterns.
[web]
Ionic Framework|https://ionicframework.com/|ionic-team/ionic-framework|Cross-platform mobile UI components built with web technologies.
Vaadin Components|https://vaadin.com/components|vaadin/web-components|Web components for forms, data grids, and application layouts.
UI5 Web Components|https://ui5.github.io/webcomponents/|SAP/ui5-webcomponents|Enterprise interface components built on web standards.
Wired Elements|https://wiredjs.com/|rough-stuff/wired-elements|Hand-drawn web components rendered with sketch-style outlines.
Elix|https://component.kitchen/elix|elix/elix|Customizable web components for common interface patterns.
Duet Date Picker|https://www.duetds.com/datepicker/|duetds/date-picker|An accessible date-picker web component for forms.
PatternFly Elements|https://patternflyelements.org/|patternfly/patternfly-elements|Framework-independent web components from the PatternFly ecosystem.
[creative]
Sonner|https://sonner.emilkowal.ski/|emilkowalski/sonner|Stacked toast notifications with gestures and smooth motion.
Vaul|https://vaul.emilkowal.ski/|emilkowalski/vaul|A drawer component for React with gesture-driven interactions.
cmdk|https://cmdk.paco.me/|pacocoursey/cmdk|Composable command menus with keyboard navigation and filtering.
React Hot Toast|https://react-hot-toast.com/|timolins/react-hot-toast|Lightweight React notifications with promise and custom rendering APIs.
Notistack|https://notistack.com/|iamhosseindhv/notistack|Stacked snackbars for React with flexible queue management.
React Toastify|https://fkhadra.github.io/react-toastify/|fkhadra/react-toastify|Configurable React toast notifications with themes and transitions.
React Tooltip|https://react-tooltip.com/|ReactTooltip/react-tooltip|Configurable tooltips with positioning and interaction options.
Floating UI|https://floating-ui.com/|floating-ui/floating-ui|Positioning primitives for tooltips, popovers, menus, and floating elements.
Driver.js|https://driverjs.com/|kamranahmedse/driver.js|Guided product tours and highlighted interface walkthroughs.
React Joyride|https://react-joyride.com/|gilbarbara/react-joyride|Interactive guided tours for React product interfaces.
Intro.js|https://introjs.com/|usablica/intro.js|Step-by-step product tours and interface hints with an open-source core.
Shepherd|https://shepherdjs.dev/|shipshapecode/shepherd|Guided tours with accessible steps and customizable positioning.
React Awesome Reveal|https://react-awesome-reveal.morello.dev/|morellodev/react-awesome-reveal|React reveal effects using Intersection Observer and CSS animations.
React Type Animation|https://react-type-animation.netlify.app/|maxeth/react-type-animation|Customizable typing animations with sequenced text changes.
Typed.js|https://mattboldt.com/demos/typed-js/|mattboldt/typed.js|Typed text effects with configurable sequences and cursor behavior.
TypeIt|https://www.typeitjs.com/|alexmacarthur/typeit|Programmable typing animations for dynamic text interfaces.
React CountUp|https://github.com/glennreyes/react-countup|glennreyes/react-countup|Animated numeric counters with a React component and hook API.
CountUp.js|https://inorganik.github.io/countUp.js/|inorganik/countUp.js|Animated number transitions with formatting and easing options.
Number Flow|https://number-flow.barvian.me/|barvian/number-flow|Smooth animated number transitions for reactive interfaces.
React Loading Skeleton|https://github.com/dvtng/react-loading-skeleton|dvtng/react-loading-skeleton|Adaptive skeleton placeholders for React content loading states.
React Spinners|https://www.davidhu.io/react-spinners/|davidhu2000/react-spinners|A collection of configurable loading indicators for React.
Hamburgers|https://jonsuh.com/hamburgers/|jonsuh/hamburgers|CSS-animated menu icons with multiple transition styles.
Tippy.js|https://atomiks.github.io/tippyjs/|atomiks/tippyjs|Configurable tooltips, popovers, and interactive floating content.
Headroom.js|https://wicky.nillia.ms/headroom.js/|WickyNilliams/headroom.js|Scroll-aware headers that reveal or hide with page movement.
Micromodal|https://micromodal.vercel.app/|ghosh/Micromodal|Small accessible modal dialogs with focus and keyboard handling.
SweetAlert2|https://sweetalert2.github.io/|sweetalert2/sweetalert2|Customizable alert dialogs, confirmations, and input prompts.
React Modal|https://reactcommunity.org/react-modal/|reactjs/react-modal|Accessible React modal dialogs with focus management.
React Accessible Accordion|https://github.com/springload/react-accessible-accordion|springload/react-accessible-accordion|React accordion components with accessible keyboard behavior.
React Intersection Observer|https://react-intersection-observer.vercel.app/|thebuilder/react-intersection-observer|React hooks and components for viewport visibility detection.
React Zoom Pan Pinch|https://bettertyped.github.io/react-zoom-pan-pinch/|BetterTyped/react-zoom-pan-pinch|Zooming, panning, and pinch gestures for React content.
'''

def candidates():
    rows = []
    category = ''
    for line in DATA.strip().splitlines():
        if line.startswith('['):
            category = line[1:-1]
            continue
        name, url, repo, description = line.split('|')
        if not url:
            continue
        resolved_category = category
        if category == 'creative':
            resolved_category = 'animation' if name in ['React Awesome Reveal', 'React Type Animation', 'Typed.js', 'TypeIt', 'React CountUp', 'CountUp.js', 'Number Flow', 'Hamburgers', 'Headroom.js', 'React Intersection Observer', 'React Zoom Pan Pinch'] else 'feedback'
        rows.append(dict(id=re.sub('[^a-z0-9]+', '-', name.lower()).strip('-'), name=name, url=url,
                         repository=repo, description=description, category=resolved_category))
    return rows

def license_kind(body):
    text = body.lower()
    # Source-available restrictions must not be mislabeled as open source.
    if any(term in text for term in ['commons clause', 'business source license', 'non-commercial', 'noncommercial', 'elastic license']):
        return None
    if 'permission is hereby granted, free of charge' in text: return 'MIT'
    if 'apache license' in text and '2.0' in text: return 'Apache-2.0'
    if 'redistribution and use in source and binary forms' in text: return 'BSD'
    if 'permission to use, copy, modify, and/or distribute' in text: return 'ISC'
    if 'mozilla public license' in text: return 'MPL-2.0'
    if 'gnu general public license' in text: return 'GPL'
    if 'gnu lesser general public license' in text: return 'LGPL'
    if 'creative commons' in text and ('cc0' in text or 'public domain' in text): return 'CC0-1.0'
    if 'this software is provided' in text and 'altered source versions' in text: return 'Zlib'
    return None

def verify(row):
    base = f"https://raw.githubusercontent.com/{row['repository']}/HEAD/"
    failures = []
    for filename in ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'LICENSE-MIT', 'LICENSE-MIT.txt']:
        try:
            response = requests.get(base + filename, timeout=12)
            if response.status_code == 200:
                kind = license_kind(response.text)
                if kind:
                    return {**row, 'license':kind, 'licenseSource':response.url, 'checked':'2026-10-21'}
                failures.append(f'Unrecognized or restricted {filename}')
                break
        except requests.RequestException:
            pass
    return {**row, 'error':failures or ['No verified root license found']}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--require-logos', action='store_true', help='Publish only projects with cached, project-owned branding.')
    args = parser.parse_args()
    evidence_path = ROOT / 'docs/featured-library-evidence.json'
    rows = candidates()
    if args.verify:
        cached = {row['id']:row for row in json.loads(evidence_path.read_text())} if evidence_path.exists() else {}
        evidence = []
        with ThreadPoolExecutor(max_workers=20) as pool:
            futures = {pool.submit(verify, row):row for row in rows if not cached.get(row['id'], {}).get('license')}
            evidence.extend(cached[row['id']] for row in rows if cached.get(row['id'], {}).get('license'))
            for future in as_completed(futures):
                row = future.result()
                evidence.append(row)
                print(f"{row.get('license', 'SKIP')} {row['name']}", flush=True)
        evidence_by_id = {row['id']:row for row in evidence}
        evidence_path.write_text(json.dumps([evidence_by_id[row['id']] for row in rows], indent=2), encoding='utf-8')
    if args.write:
        evidence = json.loads(evidence_path.read_text())
        current = {row['id']:row for row in rows}
        accepted = [{**row, **current[row['id']], 'url':URL_OVERRIDES.get(row['id'], current[row['id']]['url'])} for row in evidence if row.get('license') and row['id'] in current and row['id'] not in EXCLUDED]
        if args.require_logos:
            logos = {row['id']:row for row in json.loads((ROOT / 'public/featured/sources.json').read_text(encoding='utf-8'))}
            accepted = [row for row in accepted if logos.get(row['id'],{}).get('src')]
        data = {cat:[[r['name'], r['url'], r['description']] for r in accepted if r['category']==cat] for cat in dict.fromkeys(r['category'] for r in accepted)}
        (ROOT / 'src/data/featured-additions.json').write_text(json.dumps(data, indent=2), encoding='utf-8')
        print(json.dumps({'accepted':len(accepted), 'categories':{cat:len(items) for cat,items in data.items()}, 'skipped':[r['name'] for r in evidence if 'error' in r]}, indent=2))

if __name__ == '__main__': main()
