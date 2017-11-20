import TagRadialGraph from './js/tagRadialGraph';

let dataPath = "http://localhost:63342/KnowledgeTaggingVisualization/src/data/labelTree.json";
let outputPath = "http://localhost:63342/KnowledgeTaggingVisualization/src/data/predictPath.json";
let graph = new TagRadialGraph('graph-svg');

// Draw a complete knowledge tree
// graph.setCollapseLevel(2);
// graph.setSvgSize(3000, 3000, true);
// graph.loadTreeData(dataPath);

// Draw a predicted path
graph.setSvgSize(960, 960);
graph.loadPathData(outputPath);
