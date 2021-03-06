import Chart from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import React, { useContext, useEffect, useRef, useState } from 'react';
import ColorContext from '../contexts/ColorContext';
import useLocalStorage from '../hooks/useLocalStorage';
import { getTotalPopulationVote } from '../lib/population';
import {
  getVoteTitleAndNumber,
  isVotePopular,
  isResultSuccessful,
  getVoteTotals,
  getVotePassPercentage,
} from '../lib/votes';
import FigCaption from './FigCaption';
import Figure from './Figure';
import MapFigure from './MapFigure';
import Spinner from './Spinner';
import Pill from './Pill';

function getLabels(data) {
  const labels = [];
  const [set] = data;

  if (set[0] > 0) {
    labels.push('Yes');
  }

  if (set[1] > 0) {
    labels.push('No');
  }

  if (set[2] > 0) {
    labels.push('Abstain');
  }

  return labels;
}

function createChart(context, type, data, colors) {
  return new Chart(context, {
    type,
    data: {
      labels: getLabels(data),
      datasets: data.map((set) => ({
        data: set.filter((value) => value > 0),
        backgroundColor: Object.values(colors),
      })),
    },
    options: {
      cutoutPercentage: 0,
      plugins: {
        datalabels: {
          color: 'white',
          formatter: (value, context) =>
            context.chart.data.labels[context.dataIndex],
        },
      },
      tooltips: {
        callbacks: {
          label: (tooltipItem, data) =>
            `${data.datasets[tooltipItem.datasetIndex].data[
              tooltipItem.index
            ].toLocaleString()} (${
              Math.round(
                10000 *
                  (data.datasets[tooltipItem.datasetIndex].data[
                    tooltipItem.index
                  ] /
                    data.datasets[tooltipItem.datasetIndex].data.reduce(
                      (sum, val) => sum + val,
                      0
                    ))
              ) / 100
            }%)`,
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

export default function ChartFigure({
  id,
  vote,
  population,
  showTable = false,
}) {
  const [overlay, setOverlay] = useLocalStorage('overlay', true);
  const colors = useContext(ColorContext);

  const voteRef = useRef();
  const populationRef = useRef();
  const overlayRef = useRef();

  const { title, number } = getVoteTitleAndNumber(vote);
  const totals = getVoteTotals(vote);
  const pop = getTotalPopulationVote(vote, population);
  const passPercent = Math.round(100 * getVotePassPercentage(vote));
  const summary = {
    outcome: vote.results.votes.vote.result,
    popular: isVotePopular(vote, population),
  };

  // Fixes SSR with localstorage
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && voteRef.current) {
      const ctx = voteRef.current.getContext('2d');
      createChart(
        ctx,
        'pie',
        [[totals.yes, totals.no, totals.not_voting + totals.present]],
        colors
      );
    }
  }, [loading, voteRef, overlay, colors, vote, totals]);

  useEffect(() => {
    if (!loading && populationRef.current) {
      const ctx = populationRef.current.getContext('2d');
      createChart(ctx, 'pie', [[pop.yes, pop.no, pop.neutral]], colors);
    }
  }, [loading, populationRef, overlay, colors, pop]);

  useEffect(() => {
    if (!loading && overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d');
      createChart(
        ctx,
        'doughnut',
        [
          [pop.yes, pop.no, pop.neutral],
          [totals.yes, totals.no, totals.not_voting + totals.present],
        ],
        colors
      );
    }
  }, [loading, overlayRef, overlay, colors, pop, totals]);

  return (
    <section className="mt-10 mb-10">
      <div className="flex flex-col md:flex-row justify-start border-b-2 pb-1">
        <h3 className="mr-6 font-bold">
          {number} &bull; {vote.results.votes.vote.vote_type} to pass
        </h3>
        <div className="flex flex-row border-b-2 pb-2 md:border-b-0 md:pb-0">
          <Pill
            type={isResultSuccessful(summary.outcome) ? 'success' : 'failure'}
            className="flex self-center"
          >
            {isResultSuccessful(summary.outcome) ? 'Pass' : 'Fail'}
          </Pill>
          <Pill
            type={summary.popular ? 'success' : 'failure'}
            className="flex self-center "
          >
            {summary.popular ? '??? Popular Outcome' : '??? Unpopular Outcome'}
          </Pill>
        </div>
        <div className="pt-4 pb-4 flex flex-row-reverse justify-end md:pt-0 md:pb-0 md:flex-row md:ml-auto">
          <label
            className="inline-block align-top cursor-pointer text-sm ml-2 md:mr-2"
            htmlFor={`${id}-overlay-toggle`}
          >
            Overlay Charts
          </label>
          <input
            type="checkbox"
            className="switch"
            name={`${id}-overlay-toggle`}
            id={`${id}-overlay-toggle`}
            defaultChecked={overlay}
            onClick={() => setOverlay(!overlay)}
          />
        </div>
      </div>
      <header className="border-b-4 pt-2 pb-2 mb-2">
        <h4 className="mr-auto text-lg font-bold">{title}</h4>
      </header>

      {loading && <Spinner />}

      {!loading && !overlay && (
        <div className="flex flex-col md:flex-row flex-auto">
          <Figure>
            <canvas ref={voteRef} aria-label="Senate Vote">
              <p>
                {totals.yes} Yes votes, {totals.no} No votes,{' '}
                {totals.not_voting + totals.present} Present or Not Voting.{' '}
                {passPercent}% required to pass.
              </p>
            </canvas>
            <FigCaption>
              Senate Vote. {passPercent}% required to pass.
            </FigCaption>
          </Figure>

          <Figure>
            <canvas
              ref={populationRef}
              aria-label="Represented Population Vote"
            >
              <p>
                {pop.yes.toLocaleString()} people represented by Yes votes,{' '}
                {pop.no.toLocaleString()} people represented by No votes,{' '}
                {pop.neutral} people represented by Present votes or no vote
                cast.
              </p>
            </canvas>
            <FigCaption>Population Represented</FigCaption>
          </Figure>
        </div>
      )}

      {!loading && overlay && (
        <figure>
          <canvas
            ref={overlayRef}
            aria-label="Senate Vote Overlaid with Population Vote"
          >
            <p>
              {totals.yes} Yes votes, {totals.no} No votes,{' '}
              {totals.not_voting + totals.present} Present or Not Voting.
            </p>
            <p>
              {pop.yes.toLocaleString()} people represented by Yes votes,{' '}
              {pop.no.toLocaleString()} people represented by No votes,{' '}
              {pop.neutral} people represented by Present votes or no vote cast.
            </p>
            <p>{passPercent}% required to pass.</p>
          </canvas>
          <FigCaption>
            Inner: Senate Vote. Outer: Population Represented. {passPercent}%
            required to pass.
          </FigCaption>
        </figure>
      )}

      <MapFigure className="mt-10" vote={vote} population={population} />
    </section>
  );
}
