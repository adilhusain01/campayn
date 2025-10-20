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
    <div className="max-w-4xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-semibold text-gray-800 mb-3">Create New Campaign</h2>
        <p className="text-gray-600">Launch your campaign in just a few simple steps</p>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 mb-6">
          {success}
        </div>
      )}

      <div className="space-y-8">
        {/* Step 1: Basic Information */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
            Campaign Details
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block mb-2 font-semibold text-gray-800">Campaign Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="e.g., iPhone 17 Pro Review Campaign"
                className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-blue-400 focus:shadow-lg bg-white/80 backdrop-blur-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="block mb-2 font-semibold text-gray-800">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows="3"
                placeholder="Describe your campaign objectives and brand message..."
                className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-blue-400 focus:shadow-lg bg-white/80 backdrop-blur-sm resize-none"
              />
            </div>

            <div>
              <label htmlFor="requirements" className="block mb-2 font-semibold text-gray-800">Requirements</label>
              <textarea
                id="requirements"
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                required
                rows="3"
                placeholder="Specific requirements for influencers (e.g., minimum subscribers, content guidelines, hashtags to use...)"
                className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-blue-400 focus:shadow-lg bg-white/80 backdrop-blur-sm resize-none"
              />
            </div>
          </form>
        </div>

        {/* Step 2: Timing */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl border border-emerald-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span className="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
            Campaign Timeline
          </h3>
          <div className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="registrationEnd" className="block mb-2 font-semibold text-gray-800">Registration Deadline</label>
                <DatePicker
                  id="registrationEnd"
                  selected={registrationEndDate}
                  onChange={(date) => setRegistrationEndDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="MMMM d, yyyy h:mm aa"
                  minDate={new Date(Date.now() + 60 * 60 * 1000)}
                  placeholderText="Select registration deadline"
                  required
                  className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-emerald-400 focus:shadow-lg bg-white/80 backdrop-blur-sm"
                />
                <div className="mt-2 text-emerald-600 text-sm font-medium">⏰ At least 1 hour from now</div>
              </div>

              <div>
                <label htmlFor="campaignEnd" className="block mb-2 font-semibold text-gray-800">Campaign End Date</label>
                <DatePicker
                  id="campaignEnd"
                  selected={campaignEndDate}
                  onChange={(date) => setCampaignEndDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="MMMM d, yyyy h:mm aa"
                  minDate={new Date(registrationEndDate.getTime() + 60 * 60 * 1000)}
                  placeholderText="Select campaign end date"
                  required
                  className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-emerald-400 focus:shadow-lg bg-white/80 backdrop-blur-sm"
                />
                <div className="mt-2 text-emerald-600 text-sm font-medium">🏁 At least 1 hour after registration</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Rewards */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span className="bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
            Rewards & Launch
          </h3>
          <div className="space-y-6">

            <div>
              <label htmlFor="rewardAmount" className="block mb-2 font-semibold text-gray-800">Total Reward (FLOW)</label>
              <div className="relative">
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
                  className="w-full p-4 pl-12 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-amber-400 focus:shadow-lg bg-white/80 backdrop-blur-sm"
                />
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">Ξ</span>
              </div>
              <div className="mt-3 p-3 bg-white/60 rounded-lg">
                <div className="text-sm text-gray-600 mb-2 font-medium">💰 Reward Distribution:</div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">🥇 1st Place: 50%</span>
                  <span className="text-gray-500">🥈 2nd Place: 30%</span>
                  <span className="text-orange-600">🥉 3rd Place: 20%</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Campaign...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    🚀 Launch Campaign ({formData.rewardAmount} FLOW)
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-200 mt-8">
        <h3 className="text-gray-800 text-xl font-semibold mt-0 mb-4">How it works:</h3>
        <ol className="text-gray-600 leading-relaxed list-decimal list-inside space-y-2">
          <li>You create a campaign and deposit FLOW for rewards</li>
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