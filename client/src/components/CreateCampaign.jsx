import { useState } from 'react';
import { web3Service } from '../utils/web3.js';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const CreateCampaign = ({ walletAddress }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    rewardAmount: '0.1'
  });

  // Separate state for date/time selections
  const [registrationEndDate, setRegistrationEndDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Default: 3 days from now
  );
  const [campaignEndDate, setCampaignEndDate] = useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // Default: 10 days from now
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateDates = () => {
    const now = new Date();
    const errors = [];

    // Registration end must be in the future
    if (registrationEndDate <= now) {
      errors.push('Registration end date must be in the future');
    }

    // Campaign end must be after registration end
    if (campaignEndDate <= registrationEndDate) {
      errors.push('Campaign end date must be after registration end date');
    }

    // Minimum registration period (1 hour)
    const minRegistrationTime = new Date(now.getTime() + 60 * 60 * 1000);
    if (registrationEndDate < minRegistrationTime) {
      errors.push('Registration period must be at least 1 hour from now');
    }

    // Minimum campaign duration (1 hour after registration ends)
    const minCampaignTime = new Date(registrationEndDate.getTime() + 60 * 60 * 1000);
    if (campaignEndDate < minCampaignTime) {
      errors.push('Campaign must run for at least 1 hour after registration ends');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    // Validate dates first
    const dateErrors = validateDates();
    if (dateErrors.length > 0) {
      alert('Date validation errors:\n' + dateErrors.join('\n'));
      setLoading(false);
      return;
    }

    try {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const registrationEndTimestamp = Math.floor(registrationEndDate.getTime() / 1000);
      const campaignEndTimestamp = Math.floor(campaignEndDate.getTime() / 1000);

      // Calculate durations from now
      const registrationDuration = registrationEndTimestamp - now;
      const totalDuration = campaignEndTimestamp - now;

      const result = await web3Service.createCampaign(
        registrationDuration,
        totalDuration - registrationDuration, // Campaign duration after registration
        formData.rewardAmount
      );

      await axios.post('http://localhost:3001/api/campaigns', {
        blockchainId: result.campaignId,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements
      });

      setSuccess(`Campaign created successfully! Campaign ID: ${result.campaignId}`);
      setFormData({
        title: '',
        description: '',
        requirements: '',
        rewardAmount: '0.1'
      });

      // Reset dates to defaults
      setRegistrationEndDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
      setCampaignEndDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));

    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-campaign">
      <h2>Create New Campaign</h2>

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="campaign-form">
        <div className="form-group">
          <label htmlFor="title">Campaign Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="e.g., iPhone 17 Pro Review Campaign"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows="4"
            placeholder="Describe your campaign objectives and brand message..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="requirements">Requirements *</label>
          <textarea
            id="requirements"
            name="requirements"
            value={formData.requirements}
            onChange={handleInputChange}
            required
            rows="4"
            placeholder="Specific requirements for influencers (e.g., minimum subscribers, content guidelines, hashtags to use...)"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="registrationEnd">Registration End Date & Time *</label>
            <DatePicker
              id="registrationEnd"
              selected={registrationEndDate}
              onChange={(date) => setRegistrationEndDate(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="MMMM d, yyyy h:mm aa"
              minDate={new Date(Date.now() + 60 * 60 * 1000)} // Minimum 1 hour from now
              placeholderText="Select registration end date and time"
              required
            />
            <small>Registration period must be at least 1 hour from now</small>
          </div>

          <div className="form-group">
            <label htmlFor="campaignEnd">Campaign End Date & Time *</label>
            <DatePicker
              id="campaignEnd"
              selected={campaignEndDate}
              onChange={(date) => setCampaignEndDate(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="MMMM d, yyyy h:mm aa"
              minDate={new Date(registrationEndDate.getTime() + 60 * 60 * 1000)} // Minimum 1 hour after registration
              placeholderText="Select campaign end date and time"
              required
            />
            <small>Campaign must end at least 1 hour after registration period</small>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="rewardAmount">Total Reward (ETH) *</label>
          <input
            type="number"
            id="rewardAmount"
            name="rewardAmount"
            value={formData.rewardAmount}
            onChange={handleInputChange}
            min="0.0001"
            step="0.0001"
            required
            placeholder="0.1"
          />
          <small>This amount will be distributed as: 50% to 1st place, 30% to 2nd place, 20% to 3rd place</small>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="submit-btn"
        >
          {loading ? 'Creating Campaign...' : `Create Campaign (${formData.rewardAmount} ETH)`}
        </button>
      </form>

      <div className="campaign-info">
        <h3>How it works:</h3>
        <ol>
          <li>You create a campaign and deposit ETH for rewards</li>
          <li>Influencers register during the registration period</li>
          <li>They create YouTube videos following your requirements</li>
          <li>After the campaign ends, top 3 performers automatically receive rewards</li>
          <li>Performance is calculated based on views (60%), likes (30%), and comments (10%)</li>
        </ol>
      </div>
    </div>
  );
};

export default CreateCampaign;