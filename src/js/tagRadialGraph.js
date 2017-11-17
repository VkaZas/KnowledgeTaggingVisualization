import * as d3 from 'd3';
import _ from 'lodash';

const defaultOption = {
    graphArc : 2 * Math.PI,
    graphRadius : 2000,
    graphOffsetLeft : 40,
    graphOffsetTop : 90,
    nodeCircleRadius : 4
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

                console.log(tbound, bbound, lbound, rbound);

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
        this.tree = d3.tree()
            .size([this.graphArc, this.graphRadius])
            .separation((a, b) => { return (a.parent === b.parent ? 1 : 2) / a.depth; });
        this.link = this.node = null;
    }

    render(dataPath) {
        d3.json(dataPath, (error, data) => {
            if (error) throw error;

            let dataArr = this._reformatLabelTree(data);

            let root = this.tree(this.stratify(dataArr));

            this.link = this.g.selectAll(".link")
                .data(root.links())
                .enter().append("path")
                .attr("class", "link")
                .attr("stroke", d => confidence2Color(d.target.data.confidence))
                .attr("d", d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y));

            // enter new elements
            this.node = this.g.selectAll(".node")
                .data(root.descendants())
                .enter().append("g")
                .attr("class", d =>  "node" + (d.children ? " node--internal" : " node--leaf"))
                .attr("transform", d =>  "translate(" + radialPoint(d.x, d.y) + ")");

            // exit redundant elements
            this.node
                .data(root.descendants())
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
        });

        function radialPoint(x, y) {
            return [(y = +y) * Math.cos(x -= Math.PI / 2), y * Math.sin(x)];
        }

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

    setCircleRadius(r) {
        if (r instanceof Number)
            this.nodeCircleRadius = r;
    }
}

export default TagRadialGraph;