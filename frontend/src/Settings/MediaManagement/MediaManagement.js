import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormInputHelpText from 'Components/Form/FormInputHelpText';
import FormLabel from 'Components/Form/FormLabel';
import SpinnerButton from 'Components/Link/SpinnerButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import { inputTypes, kinds, sizes } from 'Helpers/Props';
import RemotePathMappingsConnector from 'Settings/DownloadClients/RemotePathMappings/RemotePathMappingsConnector';
import SettingsToolbarConnector from 'Settings/SettingsToolbarConnector';
import createAjaxRequest from 'Utilities/createAjaxRequest';
import translate from 'Utilities/String/translate';
import NamingConnector from './Naming/NamingConnector';
import RootFoldersConnector from './RootFolder/RootFoldersConnector';
import styles from './MediaManagement.css';

const rescanAfterRefreshOptions = [
  { key: 'always', value: 'Always' },
  { key: 'afterManual', value: 'After Manual Refresh' },
  { key: 'never', value: 'Never' }
];

const allowFingerprintingOptions = [
  { key: 'allFiles', value: 'Always' },
  { key: 'newFiles', value: 'For new imports only' },
  { key: 'never', value: 'Never' }
];

const downloadPropersAndRepacksOptions = [
  { key: 'preferAndUpgrade', value: 'Prefer and Upgrade' },
  { key: 'doNotUpgrade', value: 'Do not Upgrade Automatically' },
  { key: 'doNotPrefer', value: 'Do not Prefer' }
];

const fileDateOptions = [
  { key: 'none', value: 'None' },
  { key: 'bookReleaseDate', value: 'Book Release Date' }
];

const m4bConversionSourceActionOptions = [
  { key: 'followImportMode', value: 'Match Bookshelf Import Mode' },
  { key: 'keep', value: 'Always Keep Source Files' },
  { key: 'delete', value: 'Delete Source Files After Import' }
];

const m4bConversionAudioChannelsOptions = [
  { key: 'followSource', value: 'Follow Source' },
  { key: 'mono', value: 'Mono' },
  { key: 'stereo', value: 'Stereo' }
];

class MediaManagement extends Component {

  constructor(props, context) {
    super(props, context);

    this.state = {
      isFetchingM4bStatus: false,
      m4bStatus: null,
      m4bStatusError: null,
      isConvertExistingAudioModalOpen: false
    };
  }

  componentDidMount() {
    this.fetchM4bStatus();
  }

  componentDidUpdate(prevProps) {
    const previousSettings = prevProps.settings;
    const settings = this.props.settings;
    const previousConvertToM4b = previousSettings.convertAudiobooksToM4b?.value;
    const convertToM4b = settings.convertAudiobooksToM4b?.value;
    const previousM4bToolPath = previousSettings.m4bToolPath?.value;
    const m4bToolPath = settings.m4bToolPath?.value;

    if (
      previousConvertToM4b !== convertToM4b ||
      previousM4bToolPath !== m4bToolPath
    ) {
      this.fetchM4bStatus();
    }
  }

  fetchM4bStatus = () => {
    const {
      settings
    } = this.props;

    if (!settings.convertAudiobooksToM4b || !settings.m4bToolPath) {
      return;
    }

    if (!settings.convertAudiobooksToM4b.value) {
      this.setState({
        isFetchingM4bStatus: false,
        m4bStatus: null,
        m4bStatusError: null
      });

      return;
    }

    const m4bToolPath = settings.m4bToolPath.value || '';

    this.setState({
      isFetchingM4bStatus: true,
      m4bStatusError: null
    });

    createAjaxRequest({
      url: `/config/mediamanagement/m4bstatus?m4bToolPath=${encodeURIComponent(m4bToolPath)}`,
      dataType: 'json'
    }).request.then((m4bStatus) => {
      this.setState({
        isFetchingM4bStatus: false,
        m4bStatus
      });
    }, () => {
      this.setState({
        isFetchingM4bStatus: false,
        m4bStatus: null,
        m4bStatusError: true
      });
    });
  };

  getM4bDependencyDetail(dependency) {
    if (dependency.available) {
      return dependency.version || translate('M4bDependencyStatusAvailable');
    }

    if (dependency.required) {
      return dependency.error || translate('M4bDependencyStatusMissing');
    }

    return translate('M4bDependencyStatusOptionalMissing');
  }

  onConvertExistingAudioPress = () => {
    this.setState({ isConvertExistingAudioModalOpen: true });
  };

  onConvertExistingAudioConfirm = () => {
    this.setState({ isConvertExistingAudioModalOpen: false });
    this.props.onConvertExistingAudioToM4bPress();
  };

  onConvertExistingAudioCancel = () => {
    this.setState({ isConvertExistingAudioModalOpen: false });
  };

  renderM4bDependencyStatus() {
    const {
      isFetchingM4bStatus,
      m4bStatus,
      m4bStatusError
    } = this.state;

    if (isFetchingM4bStatus) {
      return (
        <Alert kind={kinds.INFO}>
          {translate('M4bDependencyStatusChecking')}
        </Alert>
      );
    }

    if (m4bStatusError) {
      return (
        <Alert kind={kinds.DANGER}>
          {translate('M4bDependencyStatusLoadError')}
        </Alert>
      );
    }

    if (!m4bStatus) {
      return null;
    }

    return (
      <Alert kind={m4bStatus.isReady ? kinds.SUCCESS : kinds.WARNING}>
        <div>
          {translate('M4bDependencyStatusTool', { toolPath: m4bStatus.toolPath })}
        </div>

        <ul>
          {
            m4bStatus.dependencies.map((dependency) => {
              const detail = this.getM4bDependencyDetail(dependency);
              const installHint = !dependency.available && dependency.installHint ?
                ` ${dependency.installHint}` :
                '';

              return (
                <li key={dependency.name}>
                  {dependency.name}{dependency.required ? '' : ` (${translate('Optional')})`}: {detail}{installHint}
                </li>
              );
            })
          }
        </ul>
      </Alert>
    );
  }

  //
  // Render

  render() {
    const {
      advancedSettings,
      isFetching,
      error,
      settings,
      hasSettings,
      isWindows,
      isConvertingExistingAudioToM4b,
      onInputChange,
      onSavePress,
      ...otherProps
    } = this.props;

    const {
      isFetchingM4bStatus,
      m4bStatus
    } = this.state;
    const isM4bConversionEnabled = settings.convertAudiobooksToM4b?.value;
    const isM4bConversionReady = isM4bConversionEnabled && m4bStatus?.isReady;
    const isConvertExistingAudioDisabled = !isM4bConversionReady || isFetchingM4bStatus || isConvertingExistingAudioToM4b;

    return (
      <PageContent title={translate('MediaManagementSettings')}>
        <SettingsToolbarConnector
          advancedSettings={advancedSettings}
          {...otherProps}
          onSavePress={onSavePress}
        />

        <PageContentBody>
          <RootFoldersConnector />
          <RemotePathMappingsConnector />
          <NamingConnector />

          {
            isFetching &&
              <FieldSet legend={translate('NamingSettings')}>
                <LoadingIndicator />
              </FieldSet>
          }

          {
            !isFetching && error &&
              <FieldSet legend={translate('NamingSettings')}>
                <Alert kind={kinds.DANGER}>
                  {translate('UnableToLoadMediaManagementSettings')}
                </Alert>
              </FieldSet>
          }

          {
            hasSettings && !isFetching && !error &&
              <Form
                id="mediaManagementSettings"
                {...otherProps}
              >
                {
                  advancedSettings &&
                    <FieldSet legend={translate('Folders')}>
                      <FormGroup
                        advancedSettings={advancedSettings}
                        isAdvanced={true}
                        size={sizes.MEDIUM}
                      >
                        <FormLabel>
                          {translate('CreateEmptyAuthorFolders')}
                        </FormLabel>

                        <FormInputGroup
                          type={inputTypes.CHECK}
                          name="createEmptyAuthorFolders"
                          helpText={translate('CreateEmptyAuthorFoldersHelpText')}
                          onChange={onInputChange}
                          {...settings.createEmptyAuthorFolders}
                        />
                      </FormGroup>

                      <FormGroup
                        advancedSettings={advancedSettings}
                        isAdvanced={true}
                        size={sizes.MEDIUM}
                      >
                        <FormLabel>
                          {translate('DeleteEmptyFolders')}
                        </FormLabel>

                        <FormInputGroup
                          type={inputTypes.CHECK}
                          name="deleteEmptyFolders"
                          helpText={translate('DeleteEmptyFoldersHelpText')}
                          onChange={onInputChange}
                          {...settings.deleteEmptyFolders}
                        />
                      </FormGroup>
                    </FieldSet>
                }

                {
                  advancedSettings &&
                    <FieldSet
                      legend={translate('Importing')}
                    >
                      {
                        !isWindows &&
                          <FormGroup
                            advancedSettings={advancedSettings}
                            isAdvanced={true}
                            size={sizes.MEDIUM}
                          >
                            <FormLabel>
                              {translate('SkipFreeSpaceCheck')}
                            </FormLabel>

                            <FormInputGroup
                              type={inputTypes.CHECK}
                              name="skipFreeSpaceCheckWhenImporting"
                              helpText={translate('SkipFreeSpaceCheckWhenImportingHelpText')}
                              onChange={onInputChange}
                              {...settings.skipFreeSpaceCheckWhenImporting}
                            />
                          </FormGroup>
                      }

                      <FormGroup
                        advancedSettings={advancedSettings}
                        isAdvanced={true}
                        size={sizes.MEDIUM}
                      >
                        <FormLabel>
                          {translate('MinimumFreeSpace')}
                        </FormLabel>

                        <FormInputGroup
                          type={inputTypes.NUMBER}
                          unit='MB'
                          name="minimumFreeSpaceWhenImporting"
                          helpText={translate('MinimumFreeSpaceWhenImportingHelpText')}
                          onChange={onInputChange}
                          {...settings.minimumFreeSpaceWhenImporting}
                        />
                      </FormGroup>

                      <FormGroup
                        advancedSettings={advancedSettings}
                        isAdvanced={true}
                        size={sizes.MEDIUM}
                      >
                        <FormLabel>
                          {translate('UseHardlinksInsteadOfCopy')}
                        </FormLabel>

                        <FormInputGroup
                          type={inputTypes.CHECK}
                          name="copyUsingHardlinks"
                          helpText={translate('CopyUsingHardlinksHelpText')}
                          helpTextWarning={translate('CopyUsingHardlinksHelpTextWarning')}
                          onChange={onInputChange}
                          {...settings.copyUsingHardlinks}
                        />
                      </FormGroup>

                      <FormGroup size={sizes.MEDIUM}>
                        <FormLabel>
                          {translate('ImportExtraFiles')}
                        </FormLabel>

                        <FormInputGroup
                          type={inputTypes.CHECK}
                          name="importExtraFiles"
                          helpText={translate('ImportExtraFilesHelpText')}
                          onChange={onInputChange}
                          {...settings.importExtraFiles}
                        />
                      </FormGroup>

                      {
                        settings.importExtraFiles.value ?
                          <FormGroup
                            advancedSettings={advancedSettings}
                            isAdvanced={true}
                          >
                            <FormLabel>{translate('ImportExtraFiles')}</FormLabel>

                            <FormInputGroup
                              type={inputTypes.TEXT}
                              name="extraFileExtensions"
                              helpTexts={[
                                translate('ExtraFileExtensionsHelpText'),
                                translate('ExtraFileExtensionsHelpTextsExamples')
                              ]}
                              onChange={onInputChange}
                              {...settings.extraFileExtensions}
                            />
                          </FormGroup> : null
                      }

                      <FormGroup
                        advancedSettings={advancedSettings}
                        isAdvanced={true}
                        size={sizes.MEDIUM}
                      >
                        <FormLabel>
                          {translate('ConvertAudiobooksToM4b')}
                        </FormLabel>

                        <FormInputGroup
                          type={inputTypes.CHECK}
                          name="convertAudiobooksToM4b"
                          helpText={translate('ConvertAudiobooksToM4bHelpText')}
                          onChange={onInputChange}
                          {...settings.convertAudiobooksToM4b}
                        />
                      </FormGroup>

                      {
                        settings.convertAudiobooksToM4b.value ?
                          <>
                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                            >
                              <FormLabel>
                                {translate('M4bToolPath')}
                              </FormLabel>

                              <FormInputGroup
                                type={inputTypes.TEXT}
                                name="m4bToolPath"
                                helpText={translate('M4bToolPathHelpText')}
                                onChange={onInputChange}
                                {...settings.m4bToolPath}
                              />
                            </FormGroup>

                            {this.renderM4bDependencyStatus()}

                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                            >
                              <FormLabel>
                                {translate('M4bConvertExistingAudio')}
                              </FormLabel>

                              <div className={styles.m4bExistingConversion}>
                                <SpinnerButton
                                  kind={kinds.PRIMARY}
                                  isSpinning={isConvertingExistingAudioToM4b}
                                  isDisabled={isConvertExistingAudioDisabled}
                                  onPress={this.onConvertExistingAudioPress}
                                >
                                  {translate('M4bConvertExistingAudio')}
                                </SpinnerButton>

                                <FormInputHelpText
                                  text={translate('M4bConvertExistingAudioHelpText')}
                                />
                              </div>
                            </FormGroup>

                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                            >
                              <FormLabel>
                                {translate('M4bConversionWorkingDirectory')}
                              </FormLabel>

                              <FormInputGroup
                                type={inputTypes.PATH}
                                name="m4bConversionWorkingDirectory"
                                helpText={translate('M4bConversionWorkingDirectoryHelpText')}
                                onChange={onInputChange}
                                {...settings.m4bConversionWorkingDirectory}
                              />
                            </FormGroup>

                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                            >
                              <FormLabel>
                                {translate('M4bConversionSourceAction')}
                              </FormLabel>

                              <FormInputGroup
                                type={inputTypes.SELECT}
                                name="m4bConversionSourceAction"
                                helpText={translate('M4bConversionSourceActionHelpText')}
                                values={m4bConversionSourceActionOptions}
                                onChange={onInputChange}
                                {...settings.m4bConversionSourceAction}
                              />
                            </FormGroup>

                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                            >
                              <FormLabel>
                                {translate('M4bConversionAudioBitrate')}
                              </FormLabel>

                              <FormInputGroup
                                type={inputTypes.TEXT}
                                name="m4bConversionAudioBitrate"
                                helpText={translate('M4bConversionAudioBitrateHelpText')}
                                onChange={onInputChange}
                                {...settings.m4bConversionAudioBitrate}
                              />
                            </FormGroup>

                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                            >
                              <FormLabel>
                                {translate('M4bConversionAudioCodec')}
                              </FormLabel>

                              <FormInputGroup
                                type={inputTypes.TEXT}
                                name="m4bConversionAudioCodec"
                                helpText={translate('M4bConversionAudioCodecHelpText')}
                                onChange={onInputChange}
                                {...settings.m4bConversionAudioCodec}
                              />
                            </FormGroup>

                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                            >
                              <FormLabel>
                                {translate('M4bConversionJobs')}
                              </FormLabel>

                              <FormInputGroup
                                type={inputTypes.NUMBER}
                                name="m4bConversionJobs"
                                helpText={translate('M4bConversionJobsHelpText')}
                                min={0}
                                onChange={onInputChange}
                                {...settings.m4bConversionJobs}
                              />
                            </FormGroup>

                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                            >
                              <FormLabel>
                                {translate('M4bConversionAudioChannels')}
                              </FormLabel>

                              <FormInputGroup
                                type={inputTypes.SELECT}
                                name="m4bConversionAudioChannels"
                                helpText={translate('M4bConversionAudioChannelsHelpText')}
                                values={m4bConversionAudioChannelsOptions}
                                onChange={onInputChange}
                                {...settings.m4bConversionAudioChannels}
                              />
                            </FormGroup>

                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                              size={sizes.MEDIUM}
                            >
                              <FormLabel>
                                {translate('M4bConversionOptions')}
                              </FormLabel>

                              <div className={styles.m4bConversionOptions}>
                                <FormInputGroup
                                  type={inputTypes.CHECK}
                                  name="m4bConversionUseSidecarChapters"
                                  helpText={translate('M4bConversionUseSidecarChapters')}
                                  onChange={onInputChange}
                                  {...settings.m4bConversionUseSidecarChapters}
                                />

                                <FormInputGroup
                                  type={inputTypes.CHECK}
                                  name="m4bConversionUseFilenamesAsChapters"
                                  helpText={translate('M4bConversionUseFilenamesAsChapters')}
                                  onChange={onInputChange}
                                  {...settings.m4bConversionUseFilenamesAsChapters}
                                />

                                <FormInputGroup
                                  type={inputTypes.CHECK}
                                  name="m4bConversionNoChapterReindexing"
                                  helpText={translate('M4bConversionNoChapterReindexing')}
                                  onChange={onInputChange}
                                  {...settings.m4bConversionNoChapterReindexing}
                                />

                                <FormInputGroup
                                  type={inputTypes.CHECK}
                                  name="m4bConversionUseSourceCover"
                                  helpText={translate('M4bConversionUseSourceCover')}
                                  onChange={onInputChange}
                                  {...settings.m4bConversionUseSourceCover}
                                />
                              </div>
                            </FormGroup>

                            <FormGroup
                              advancedSettings={advancedSettings}
                              isAdvanced={true}
                            >
                              <FormLabel>
                                {translate('M4bConversionExtraArguments')}
                              </FormLabel>

                              <FormInputGroup
                                type={inputTypes.TEXT}
                                name="m4bConversionExtraArguments"
                                helpText={translate('M4bConversionExtraArgumentsHelpText')}
                                onChange={onInputChange}
                                {...settings.m4bConversionExtraArguments}
                              />
                            </FormGroup>
                          </> : null
                      }
                    </FieldSet>
                }

                <FieldSet
                  legend={translate('FileManagement')}
                >
                  <FormGroup size={sizes.MEDIUM}>
                    <FormLabel>
                      {translate('IgnoreDeletedBooks')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.CHECK}
                      name="autoUnmonitorPreviouslyDownloadedBooks"
                      helpText={translate('AutoUnmonitorPreviouslyDownloadedBooksHelpText')}
                      onChange={onInputChange}
                      {...settings.autoUnmonitorPreviouslyDownloadedBooks}
                    />
                  </FormGroup>

                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                    size={sizes.MEDIUM}
                  >
                    <FormLabel>
                      {translate('PropersAndRepacks')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.SELECT}
                      name="downloadPropersAndRepacks"
                      helpTexts={[
                        translate('DownloadPropersAndRepacksHelpTexts1'),
                        translate('DownloadPropersAndRepacksHelpTexts2')
                      ]}
                      helpTextWarning={
                        settings.downloadPropersAndRepacks.value === 'doNotPrefer' ?
                          'Use custom formats for automatic upgrades to propers/repacks' :
                          undefined
                      }
                      values={downloadPropersAndRepacksOptions}
                      onChange={onInputChange}
                      {...settings.downloadPropersAndRepacks}
                    />
                  </FormGroup>

                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                    size={sizes.MEDIUM}
                  >
                    <FormLabel>
                      {translate('WatchRootFoldersForFileChanges')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.CHECK}
                      name="watchLibraryForChanges"
                      helpText={translate('WatchLibraryForChangesHelpText')}
                      onChange={onInputChange}
                      {...settings.watchLibraryForChanges}
                    />
                  </FormGroup>

                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                  >
                    <FormLabel>
                      {translate('RescanAuthorFolderAfterRefresh')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.SELECT}
                      name="rescanAfterRefresh"
                      helpText={translate('RescanAfterRefreshHelpText')}
                      helpTextWarning={translate('RescanAfterRefreshHelpTextWarning')}
                      values={rescanAfterRefreshOptions}
                      onChange={onInputChange}
                      {...settings.rescanAfterRefresh}
                    />
                  </FormGroup>

                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                  >
                    <FormLabel>
                      {translate('AllowFingerprinting')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.SELECT}
                      name="allowFingerprinting"
                      helpText={translate('AllowFingerprintingHelpText')}
                      helpTextWarning={translate('AllowFingerprintingHelpTextWarning')}
                      values={allowFingerprintingOptions}
                      onChange={onInputChange}
                      {...settings.allowFingerprinting}
                    />
                  </FormGroup>

                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                  >
                    <FormLabel>
                      {translate('ChangeFileDate')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.SELECT}
                      name="fileDate"
                      helpText={translate('FileDateHelpText')}
                      values={fileDateOptions}
                      onChange={onInputChange}
                      {...settings.fileDate}
                    />
                  </FormGroup>

                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                  >
                    <FormLabel>
                      {translate('RecyclingBin')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.PATH}
                      name="recycleBin"
                      helpText={translate('RecycleBinHelpText')}
                      onChange={onInputChange}
                      {...settings.recycleBin}
                    />
                  </FormGroup>

                  <FormGroup
                    advancedSettings={advancedSettings}
                    isAdvanced={true}
                  >
                    <FormLabel>
                      {translate('RecyclingBinCleanup')}
                    </FormLabel>

                    <FormInputGroup
                      type={inputTypes.NUMBER}
                      name="recycleBinCleanupDays"
                      helpText={translate('RecycleBinCleanupDaysHelpText')}
                      helpTextWarning={translate('RecycleBinCleanupDaysHelpTextWarning')}
                      min={0}
                      onChange={onInputChange}
                      {...settings.recycleBinCleanupDays}
                    />
                  </FormGroup>
                </FieldSet>

                {
                  advancedSettings && !isWindows &&
                    <FieldSet
                      legend={translate('Permissions')}
                    >
                      <FormGroup
                        advancedSettings={advancedSettings}
                        isAdvanced={true}
                        size={sizes.MEDIUM}
                      >
                        <FormLabel>
                          {translate('SetPermissions')}
                        </FormLabel>

                        <FormInputGroup
                          type={inputTypes.CHECK}
                          name="setPermissionsLinux"
                          helpText={translate('SetPermissionsLinuxHelpText')}
                          helpTextWarning={translate('SetPermissionsLinuxHelpTextWarning')}
                          onChange={onInputChange}
                          {...settings.setPermissionsLinux}
                        />
                      </FormGroup>

                      <FormGroup
                        advancedSettings={advancedSettings}
                        isAdvanced={true}
                      >
                        <FormLabel>
                          {translate('ChmodFolder')}
                        </FormLabel>

                        <FormInputGroup
                          type={inputTypes.UMASK}
                          name="chmodFolder"
                          helpText={translate('ChmodFolderHelpText')}
                          helpTextWarning={translate('ChmodFolderHelpTextWarning')}
                          onChange={onInputChange}
                          {...settings.chmodFolder}
                        />
                      </FormGroup>

                      <FormGroup
                        advancedSettings={advancedSettings}
                        isAdvanced={true}
                      >
                        <FormLabel>
                          {translate('ChownGroup')}
                        </FormLabel>

                        <FormInputGroup
                          type={inputTypes.TEXT}
                          name="chownGroup"
                          helpText={translate('ChownGroupHelpText')}
                          helpTextWarning={translate('ChownGroupHelpTextWarning')}
                          values={fileDateOptions}
                          onChange={onInputChange}
                          {...settings.chownGroup}
                        />
                      </FormGroup>
                    </FieldSet>
                }
              </Form>
          }
        </PageContentBody>

        <ConfirmModal
          isOpen={this.state.isConvertExistingAudioModalOpen}
          kind={kinds.PRIMARY}
          title={translate('M4bConvertExistingAudio')}
          message={translate('M4bConvertExistingAudioModalMessage')}
          confirmLabel={translate('M4bConvertExistingAudio')}
          cancelLabel={translate('Cancel')}
          onConfirm={this.onConvertExistingAudioConfirm}
          onCancel={this.onConvertExistingAudioCancel}
        />
      </PageContent>
    );
  }

}

MediaManagement.propTypes = {
  advancedSettings: PropTypes.bool.isRequired,
  isFetching: PropTypes.bool.isRequired,
  error: PropTypes.object,
  settings: PropTypes.object.isRequired,
  hasSettings: PropTypes.bool.isRequired,
  isWindows: PropTypes.bool.isRequired,
  isConvertingExistingAudioToM4b: PropTypes.bool.isRequired,
  onSavePress: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onConvertExistingAudioToM4bPress: PropTypes.func.isRequired
};

export default MediaManagement;
