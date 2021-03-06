
import '@resources/style/react/ui/consent.scss';
import React from 'react';
import { connect } from 'react-redux';

import { Logo } from './stage/ui/logo';

import { createEnableResearch } from '@/store/action/preferences';

interface ConsentFormDispatchProps {
  enableResearch(enable: boolean): void;
}

const ConsentPageImpl: React.FC<ConsentFormDispatchProps> = (props) => {
  const { enableResearch } = props;

  return (
    <div id='reduct-consent'>
      <Logo />

      <div className='reduct-consent-highlight'>
        <strong>Reduct is part of an education research project</strong>

        <p>
          For the first time this year, the Reduct game is used in combination with
          the CASE exam to help make CS placement decisions. The Cornell Future of
          Learning Lab is studying how games compare to traditional exams for
          placement decisions. We are asking for your permission to use your data for
          this research project led by Prof. Rene Kizilcec in Cornell Information
          Science.
        </p>
      </div>

      <p>
        <b>About this study:</b> The purpose of this research is to compare students’
        performance and experience on the CASE exam vs. Reduct, and which one is more
        predictive of how they do in CS courses. We hope to learn about how to make
        accurate and fair placement tests. There are no risks from participating in
        this research.
      </p>

      <p>
        <b>Voluntary participation:</b> Participation is <em>voluntary</em> and
        <em>not compensated</em>. You can use Reduct for your CS placement,
        <em>independent of whether you decide to give your consent for having your
          data used in this research study
        </em>. You can contact the research team at
        kizilcec@cornell.edu at any time if you change your mind.
      </p>

      <p>
        <b>Privacy/Confidentiality/Data Security:</b> We protect your privacy and your
        information will never be revealed in publications or presentations. We will
        combine your Reduct log data, CASE exam score, post-game survey response,
        placement decision, and subsequent course grades using your netid. We will
        de-identify the data and store it securely. De-identified data from this study
        may be shared with the research community at large to advance science and
        health. We will remove or code any personal information that could identify
        you before files are shared with other researchers to ensure that, by current
        scientific standards and known methods, no one will be able to identify you
        from the information we share. Despite these measures, we cannot guarantee
        anonymity of your personal data. Identifiable information might be used for
        future research with obtaining your consent.
      </p>

      <p>
        <b>Questions?</b> Contact the main researcher at any time: Prof. Rene Kizilcec
        (kizilcec@cornell.edu). If you have any questions or concerns regarding your
        rights as a subject in this study, you may contact the Institutional Review
        Board (IRB) for Human Participants at 607-255-5138 or access their website at
        {' '}<a href="http://www.irb.cornell.edu">irb.cornell.edu</a>. You may also report
        your concerns or complaints anonymously through Ethicspoint online at
        {' '}<a href="http://www.hotline.cornell.edu">hotline.cornell.edu</a> or by calling toll free at 1-866-293-3077. Ethicspoint
        is an independent organization that serves as a liaison between the University
        and the person bringing the complaint so that anonymity can be ensured.
      </p>

      <div className='reduct-consent-highlight'>
        <p>
          I have read the above information, and received answers to any questions I
          asked. I consent to take part in the study.
        </p>
        <div id='reduct-consent-buttons'>
          <button type='button' className='btn btn-default' onClick={() => enableResearch(false)}> NO, I decline
            participation.
          </button>

          <button type='button' className='btn btn-primary' onClick={() => enableResearch(true)}> YES, I approve.
          </button>
        </div>
      </div>

    </div>
  );
};

export const ConsentPage = connect(null, (dispatch) => ({
  enableResearch(enable: boolean) {
    dispatch(createEnableResearch(enable));
  },
}))(ConsentPageImpl);
