import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import * as commandNames from 'Commands/commandNames';
import { clearPendingChanges } from 'Store/Actions/baseActions';
import { executeCommand } from 'Store/Actions/commandActions';
import { fetchMediaManagementSettings, saveMediaManagementSettings, saveNamingSettings, setMediaManagementSettingsValue } from 'Store/Actions/settingsActions';
import createCommandExecutingSelector from 'Store/Selectors/createCommandExecutingSelector';
import createSettingsSectionSelector from 'Store/Selectors/createSettingsSectionSelector';
import createSystemStatusSelector from 'Store/Selectors/createSystemStatusSelector';
import MediaManagement from './MediaManagement';

const SECTION = 'mediaManagement';

function createMapStateToProps() {
  return createSelector(
    (state) => state.settings.advancedSettings,
    (state) => state.settings.naming,
    createSettingsSectionSelector(SECTION),
    createSystemStatusSelector(),
    createCommandExecutingSelector(commandNames.CONVERT_EXISTING_AUDIO_TO_M4B, { all: true }),
    (advancedSettings, namingSettings, sectionSettings, systemStatus, isConvertingExistingAudioToM4b) => {
      return {
        advancedSettings,
        ...sectionSettings,
        hasPendingChanges: !_.isEmpty(namingSettings.pendingChanges) || sectionSettings.hasPendingChanges,
        isWindows: systemStatus.isWindows,
        isConvertingExistingAudioToM4b
      };
    }
  );
}

const mapDispatchToProps = {
  fetchMediaManagementSettings,
  setMediaManagementSettingsValue,
  saveMediaManagementSettings,
  saveNamingSettings,
  clearPendingChanges,
  dispatchExecuteCommand: executeCommand
};

class MediaManagementConnector extends Component {

  //
  // Lifecycle

  componentDidMount() {
    this.props.fetchMediaManagementSettings();
  }

  componentWillUnmount() {
    this.props.clearPendingChanges({ section: `settings.${SECTION}` });
  }

  //
  // Listeners

  onInputChange = ({ name, value }) => {
    this.props.setMediaManagementSettingsValue({ name, value });
  };

  onSavePress = () => {
    this.props.saveMediaManagementSettings();
    this.props.saveNamingSettings();
  };

  onConvertExistingAudioToM4bPress = () => {
    this.props.dispatchExecuteCommand({
      name: commandNames.CONVERT_EXISTING_AUDIO_TO_M4B,
      all: true
    });
  };

  //
  // Render

  render() {
    return (
      <MediaManagement
        onInputChange={this.onInputChange}
        onSavePress={this.onSavePress}
        onConvertExistingAudioToM4bPress={this.onConvertExistingAudioToM4bPress}
        {...this.props}
      />
    );
  }
}

MediaManagementConnector.propTypes = {
  fetchMediaManagementSettings: PropTypes.func.isRequired,
  setMediaManagementSettingsValue: PropTypes.func.isRequired,
  saveMediaManagementSettings: PropTypes.func.isRequired,
  saveNamingSettings: PropTypes.func.isRequired,
  clearPendingChanges: PropTypes.func.isRequired,
  dispatchExecuteCommand: PropTypes.func.isRequired
};

export default connect(createMapStateToProps, mapDispatchToProps)(MediaManagementConnector);
