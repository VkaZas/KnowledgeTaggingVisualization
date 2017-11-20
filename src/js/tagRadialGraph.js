import * as d3 from 'd3';
import _ from 'lodash';

const defaultOption = {
    graphArc : 2 * Math.PI,
    graphRadius : 1500,
    graphOffsetLeft : 0,
    graphOffsetTop : 0,
    nodeCircleRadius : 4,
    collapseHeightLevel : 2
};

class TagRadialGraph {
    constructor(svgName, option) {
        Object.assign(this, defaultOption, option);
        this.svg = d3.select('#' + svgName)
            .call(d3.zoom().on("zoom", () => {
                let scale = d3.event.transform.k,
                    translation = [d3.event.transform.x, d3.event.transform.y],
                    tbound = -this.height * scale,
                    bbound = this.height * scale,
                    lbound = (-this.width) * scale,
                    rbound = (this.width) * scale;

                // limit translation to thresholds
                translation = [
                    Math.max(Math.min(translation[0], rbound), lbound),
                    Math.max(Math.min(translation[1], bbound), tbound)
                ];

                // console.log(tbound, bbound, lbound, rbound);

                this.scaleG
                    .attr("transform", "translate(" + translation + ")" +
                        " scale(" + scale + ")");
            }));
        this.width = +this.svg.attr('width');
        this.height = +this.svg.attr('height');
        this.scaleG = this.svg.append("g");
        this.g = this.scaleG.append("g").attr("transform", "translate(" + (this.width / 2 + this.graphOffsetLeft) + "," + (this.height / 2 + this.graphOffsetTop) + ")");
        this.stratify = d3.stratify()
            .id(d => d.index)
            .parentId(d => d.parentIndex);
        this.radialLink = d3.linkRadial()
            .angle(d => d.x)
            .radius(d => d.y);
        this.horizontalLink = d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x);
        this.verticalLink = d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y);
        this.linkMethod = this.radialLink;
        this.link = this.node = null;
    }

    setSvgSize(width, height, radial = false) {
        this.svg.attr('width', this.width = width)
            .attr('height', this.height = height)
            .style('width', width + 'px')
            .style('height', height + 'px');
        if (!radial) {
            this.g.attr("transform", "translate(" + this.graphOffsetLeft + ', ' + this.graphOffsetTop + ")");
        } else {
            this.g.attr("transform", "translate(" + (this.width / 3 + this.graphOffsetLeft) + "," + (this.height / 3 + this.graphOffsetTop) + ")")
        }

    }

    loadTreeData(dataPath) {
        this.tree = d3.tree()
            .size([this.graphArc, this.width / 3 * 2])
            .separation((a, b) => { return (a.parent === b.parent ? 1 : 2) / a.depth; });

        d3.json(dataPath, (error, data) => {
            this.root = this.backupRoot = this.tree(this.stratify(this._reformatLabelTree(data)));
            this.collapseHeight(this.root);
            this.render();
        });
    }

    setCollapseLevel(level) {
        this.collapseHeightLevel = level;
    }

    collapseHeight(node) {
        if (node.depth === this.collapseHeightLevel) {
            node.children = null;
        } else {
            for (let child of node.children) this.collapseHeight(child);
        }
    }

    loadPathData(dataPath) {
        this.tree = d3.tree()
            .size([this.width, this.height - 160]);

        d3.json(dataPath, (error, data) => {
            this.root = this.tree(this.stratify(this._reformatOutput(data)));
            this.renderPath();
        });
    }

    render() {
        this.g.empty();

        this.link = this.g.selectAll(".link")
            .data(this.root.links())
            .enter().append("path")
            .attr("class", "link")
            .attr("stroke", d => confidence2Color(d.target.data.confidence))
            .attr("d", this.radialLink);

        // enter new elements
        this.node = this.g.selectAll(".node")
            .data(this.root.descendants())
            .enter().append("g")
            .attr("class", d =>  "node" + (d.children ? " node--internal" : " node--leaf"))
            .attr("transform", d =>  "translate(" + radialPoint(d.x, d.y) + ")");

        // exit redundant elements
        this.node
            .data(this.root.descendants())
            .exit()
            .remove();

        this.node.append("circle")
            .attr("r", this.nodeCircleRadius)
            .attr("stroke", "black")
            .attr("fill", d => confidence2Color(d.data.confidence));

        this.node.append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
            .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
            .attr("transform", d => "rotate(" + (d.x < Math.PI ? d.x - Math.PI / 2 : d.x + Math.PI / 2) * 180 / Math.PI + ")")
            .attr("stroke", d => confidence2Color(d.data.confidence))
            .text(d => d.data.label);


        function radialPoint(x, y) {
            return [(y = +y) * Math.cos(x -= Math.PI / 2), y * Math.sin(x)];
        }

        function confidence2Color(c) {
            if (!c) return 'rgb(255,255,255)';
            return d3.interpolateWarm(c / 100.0);
        }
    }

    renderPath() {
        this.g.empty();

        this.link = this.g.selectAll(".link")
            .data(this.root.links())
            .enter().append("path")
            .attr("class", "link")
            .attr("stroke", d => confidence2Color(d.target.data.confidence))
            .attr("d", this.verticalLink);

        // enter new elements
        this.node = this.g.selectAll(".node")
            .data(this.root.descendants())
            .enter().append("g")
            .attr("class", d =>  "node" + (d.children ? " node--internal" : " node--leaf"))
            .attr("transform", d =>  "translate(" + d.x + "," + d.y + ")");

        // exit redundant elements
        this.node
            .data(this.root.descendants())
            .exit()
            .remove();

        this.node.append("circle")
            .attr("r", this.nodeCircleRadius)
            .attr("stroke", "black")
            .attr("fill", d => confidence2Color(d.data.confidence));

        this.node.append("text")
            .attr("dy", d => d.children ? -25 : 25)
            .attr("x", d => -70)
            .style("text-anchor", "start")
            .attr("stroke", d => confidence2Color(d.data.confidence))
            .attr("fill", d => confidence2Color(d.data.confidence))
            .attr("class", "big-text")
            .text(d => d.data.label + ' ' + d.data.confidence + '%');

        function confidence2Color(c) {
            if (!c) return 'rgb(255,255,255)';
            return d3.interpolateWarm(c / 100.0);
        }
    }

    _reformatLabelTree(root) {
        let res = [];
        reconstruct(root, null);

        function reconstruct(node, pID) {
            let nodeObj = _.cloneDeep(node);
            nodeObj.children = null;
            nodeObj.parentIndex = pID;
            nodeObj.confidence = Math.ceil(Math.random() * 100);
            res.push(nodeObj);
            for (let child of node.children)
                reconstruct(child, node.index);
        }
        return res;
    }

    _reformatOutput(data) {
        let res = [], vis = new Map();

        for (let path of data) {
            console.log(path);
            for (let i = 0; i < path.length; i++) {
                if (vis.has(path[i].Prediction)) {
                    continue;
                } else {
                    vis.set(path[i].Prediction, 1);
                }
                let nodeObj = _.cloneDeep(path[i]);
                if (i !== 0) {
                    nodeObj.parentIndex = path[i - 1].Prediction;
                } else {
                    nodeObj.parentIndex = null;
                }
                nodeObj.confidence = parseFloat(nodeObj.Confidence).toPrecision(4);
                nodeObj.index = nodeObj.Prediction;
                nodeObj.label = nodeObj.Concept;
                res.push(nodeObj);
            }
        }
        return res;
    }

    setCircleRadius(r) {
        if (r instanceof Number)
            this.nodeCircleRadius = r;
    }
}

export default TagRadialGraph;