import React from 'react';
import PropTypes from 'prop-types';
import { usePlanner } from '../../context/PlannerContext';
import {FaFolderOpen as IconLoad} from 'react-icons/fa';
import ToolbarButton from './toolbar-button';

export default function ToolbarLoadButton({state}) {
  const { translator } = usePlanner();

  let loadProjectFromFile = event => {
    event.preventDefault();
  };

  return (
    <ToolbarButton active={false} tooltip={translator.t("Load project")} onClick={loadProjectFromFile}>
      <IconLoad />
    </ToolbarButton>
  );
}

ToolbarLoadButton.propTypes = {
  state: PropTypes.object.isRequired,
};

