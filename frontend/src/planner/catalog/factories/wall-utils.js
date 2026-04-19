import * as Geometry from '../../utils/geometry';

function normalizeAngle(angle) {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= 2 * Math.PI;
  while (normalized < -Math.PI) normalized += 2 * Math.PI;
  return normalized;
}

function getLineProperty(line, propertyName, fallback = 0) {
  const value = line?.getIn?.(['properties', propertyName, 'length']);
  return Number.isFinite(value) ? value : fallback;
}

export function calculateWallMiterOffsets(vertex0, vertex1, currentLineID, layer, thickness) {
  const halfThickness = thickness / 2;
  const result = {
    miter0: { extend: 0, side: 0 },
    miter1: { extend: 0, side: 0 },
  };

  const wallAngle = Math.atan2(vertex1.y - vertex0.y, vertex1.x - vertex0.x);

  const calculateVertexMiter = (vertex, isStartVertex) => {
    const vertexLines = vertex?.lines;
    if (!vertexLines || vertexLines.size !== 2) return null;

    const otherLineID = vertexLines.find((id) => id !== currentLineID);
    if (!otherLineID) return null;

    const otherLine = layer?.lines?.get(otherLineID);
    if (!otherLine) return null;

    const otherV0 = layer.vertices.get(otherLine.vertices.get(0));
    const otherV1 = layer.vertices.get(otherLine.vertices.get(1));
    const adjacentVertex = otherV0?.id === vertex.id ? otherV1 : otherV0;
    if (!adjacentVertex) return null;

    const currentDir = isStartVertex ? wallAngle : wallAngle + Math.PI;
    const adjacentAngle = Math.atan2(adjacentVertex.y - vertex.y, adjacentVertex.x - vertex.x);
    const angleDiff = normalizeAngle(adjacentAngle - currentDir);

    if (Math.abs(angleDiff) < 0.01 || Math.abs(Math.abs(angleDiff) - Math.PI) < 0.01) {
      return null;
    }

    const extension = halfThickness / Math.tan(Math.abs(angleDiff / 2));
    let side = angleDiff > 0 ? 1 : -1;
    if (!isStartVertex) side = -side;

    return {
      extend: Math.abs(extension),
      side,
    };
  };

  const miter0 = calculateVertexMiter(vertex0, true);
  const miter1 = calculateVertexMiter(vertex1, false);

  if (miter0) result.miter0 = miter0;
  if (miter1) result.miter1 = miter1;

  return result;
}

export function getWallEdgeMetrics(line, layer, verticesOverride = null) {
  const vertex0 = verticesOverride?.vertex0 || layer.vertices.get(line.vertices.get(0));
  const vertex1 = verticesOverride?.vertex1 || layer.vertices.get(line.vertices.get(1));

  if (!vertex0 || !vertex1) {
    return null;
  }

  const length = Geometry.pointsDistance(vertex0.x, vertex0.y, vertex1.x, vertex1.y);
  const thickness = getLineProperty(line, 'thickness', 0);
  const halfThickness = thickness / 2;
  const { miter0, miter1 } = calculateWallMiterOffsets(vertex0, vertex1, line.id, layer, thickness);

  let negativeStart = 0;
  let positiveStart = 0;
  let negativeEnd = length;
  let positiveEnd = length;

  if (miter0.extend > 0) {
    if (miter0.side > 0) {
      positiveStart = miter0.extend;
      negativeStart = -miter0.extend;
    } else {
      negativeStart = miter0.extend;
      positiveStart = -miter0.extend;
    }
  }

  if (miter1.extend > 0) {
    if (miter1.side > 0) {
      positiveEnd = length - miter1.extend;
      negativeEnd = length + miter1.extend;
    } else {
      negativeEnd = length - miter1.extend;
      positiveEnd = length + miter1.extend;
    }
  }

  const negativeEdge = {
    side: 'negative',
    start: negativeStart,
    end: negativeEnd,
    length: negativeEnd - negativeStart,
    y: -halfThickness,
  };

  const positiveEdge = {
    side: 'positive',
    start: positiveStart,
    end: positiveEnd,
    length: positiveEnd - positiveStart,
    y: halfThickness,
  };

  const sideAInside = line?.getIn?.(['properties', 'sideAInside']);
  let innerEdge;
  let outerEdge;

  if (sideAInside === true) {
    innerEdge = negativeEdge;
    outerEdge = positiveEdge;
  } else if (sideAInside === false) {
    innerEdge = positiveEdge;
    outerEdge = negativeEdge;
  } else if (negativeEdge.length <= positiveEdge.length) {
    innerEdge = negativeEdge;
    outerEdge = positiveEdge;
  } else {
    innerEdge = positiveEdge;
    outerEdge = negativeEdge;
  }

  return {
    vertex0,
    vertex1,
    length,
    thickness,
    halfThickness,
    miter0,
    miter1,
    negativeEdge,
    positiveEdge,
    innerEdge,
    outerEdge,
  };
}
